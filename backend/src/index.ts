// 设置时区为中国北京时间
process.env.TZ = 'Asia/Shanghai';

import db from './config/database';
import app from './app';
import { env } from './config/env';
import logger from './utils/logger';
import { startRecurringWarningCheck } from './services/recurringWarning.service';

// ── 启动时自动清理旧聊天记录（移到定时任务，每24小时检查一次） ──
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24小时
const CHAT_RETENTION_DAYS = 30; // 聊天记录保留30天

async function cleanOldData() {
  try {
    const cutoff = new Date(Date.now() - CHAT_RETENTION_DAYS * 86400000).toISOString();
    const deletedChat = await db('chat_history').where('created_at', '<', cutoff).delete();
    if (deletedChat > 0) logger.info(`已清理 ${deletedChat} 条30天前的旧聊天记录`);
  } catch (err) {
    logger.error('清理旧聊天记录失败:', err);
  }

  // 原始记录保留3天
  try {
    const rawCutoff = new Date(Date.now() - 3 * 86400000).toISOString();
    const deletedRaw = await db('raw_messages').where('created_at', '<', rawCutoff).delete();
    if (deletedRaw > 0) logger.info(`已清理 ${deletedRaw} 条3天前的数据录入原始记录`);
  } catch (err) {
    logger.error('清理原始记录失败:', err);
  }

  // 舱位信息：前一天录入的，每晚20:00后清除
  await cleanExpiredCargoSpaces();
}

/** 舱位信息保留7天，每24小时检查一次，7天前的数据清理 */
async function cleanExpiredCargoSpaces() {
  try {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    const deleted = await db('cargo_spaces')
      .where('created_at', '<', cutoff)
      .delete();
    if (deleted > 0) logger.info(`已清理 ${deleted} 条7天前的舱位信息`);
  } catch (err) {
    logger.error('清理过期舱位信息失败:', err);
  }
}

// ── 未登录用户提醒 ──
async function remindInactiveUsers() {
  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();
    const inactiveUsers = await db('users')
      .whereNull('last_login_at')
      .where('created_at', '<', threeDaysAgo)
      .select('id', 'display_name', 'email', 'username', 'email_verified', 'created_at', 'last_reminder_at')
      .limit(200) as any[];
    let sentCount = 0;
    const { sendInactiveReminderEmail } = await import('./services/email.service');
    for (const user of inactiveUsers) {
      if (!user.email || !user.email_verified) continue;
      const createdTime = new Date(user.created_at).getTime();
      const lastReminderTime = user.last_reminder_at ? new Date(user.last_reminder_at).getTime() : 0;
      const shouldSendFirst = !user.last_reminder_at;
      const shouldRepeat = createdTime < (now.getTime() - 7 * 86400000) && lastReminderTime > 0 && (now.getTime() - lastReminderTime) >= 7 * 86400000;
      if (shouldSendFirst || shouldRepeat) {
        try {
          await sendInactiveReminderEmail(user.email, user.display_name, user.username);
          await db('users').where({ id: user.id }).update({ last_reminder_at: now.toISOString() });
          sentCount++;
        } catch (e) { logger.error(`发送未登录提醒给 ${user.email} 失败:`, e); }
      }
    }
    if (sentCount > 0) logger.info(`未登录提醒: 已发送 ${sentCount} 封邮件`);
  } catch (err) { logger.error('未登录用户提醒失败:', err); }
}

/** 会员到期提醒：每天检查一次，7天内到期 + 已过期用户 */
async function remindExpiringUsers() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    // 7天内到期且上次提醒是2天前
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
    const expiringSoon = await db('users')
      .whereIn('role', ['forwarder', 'inspector', 'insurer'])
      .whereNotNull('trial_end')
      .where('trial_end', '>=', today)
      .where('trial_end', '<=', sevenDaysLater)
      .where(function () {
        this.whereNull('last_reminder_at').orWhere('last_reminder_at', '<', twoDaysAgo);
      })
      .select('id', 'display_name', 'email', 'trial_end', 'email_verified', 'last_reminder_at') as any[];

    // 已过期但上次提醒不是今天（每3天发一次）
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
    const expired = await db('users')
      .whereIn('role', ['forwarder', 'inspector', 'insurer'])
      .whereNotNull('trial_end')
      .where('trial_end', '<', today)
      .where(function () {
        this.whereNull('last_reminder_at').orWhere('last_reminder_at', '<', threeDaysAgo);
      })
      .select('id', 'display_name', 'email', 'trial_end', 'email_verified', 'last_reminder_at') as any[];

    const { sendTrialExpiryReminderEmail } = await import('./services/email.service');
    let sentCount = 0;

    for (const user of [...expiringSoon, ...expired]) {
      if (!user.email || !user.email_verified) continue;
      const remaining = user.trial_end ? Math.ceil((new Date(user.trial_end + 'T23:59:59').getTime() - Date.now()) / 86400000) : 0;
      try {
        await sendTrialExpiryReminderEmail(user.email, user.display_name, user.trial_end || '', remaining);
        await db('users').where({ id: user.id }).update({ last_reminder_at: new Date().toISOString() });
        sentCount++;
      } catch (e) { logger.error(`发送到期提醒给 ${user.email} 失败:`, e); }
    }
    if (sentCount > 0) logger.info(`到期提醒: 已发送 ${sentCount} 封邮件（${expiringSoon.length} 即将到期 + ${expired.length} 已过期）`);
  } catch (err) { logger.error('到期提醒任务失败:', err); }
}

app.listen(env.port, async () => {
  // 启动后延迟1小时再执行首次清理，避免重启丢数据
  setTimeout(cleanOldData, 60 * 60 * 1000);
  setInterval(cleanOldData, CLEANUP_INTERVAL);
  // 舱位清理：每6小时检查一次，清除7天前的数据
  setInterval(cleanExpiredCargoSpaces, 6 * 60 * 60 * 1000);
  // 未登录用户提醒：每6小时检查一次
  setInterval(remindInactiveUsers, 6 * 60 * 60 * 1000);
  setTimeout(remindInactiveUsers, 2 * 60 * 60 * 1000); // 启动后2小时首次检查
  // 会员到期提醒：每天8:00检查一次
  const msUntil8am = (new Date().getHours() >= 8 ? 24 : 8 - new Date().getHours()) * 60 * 60 * 1000 - new Date().getMinutes() * 60 * 1000 - new Date().getSeconds() * 1000;
  setTimeout(() => { remindExpiringUsers(); setInterval(remindExpiringUsers, 24 * 60 * 60 * 1000); }, msUntil8am);
  startRecurringWarningCheck();

  // ── 报关券定时任务 ──
  // 每日凌晨1:00检查过期券
  const msUntil1am = (new Date().getHours() >= 1 ? 24 : 1 - new Date().getHours()) * 60 * 60 * 1000 - new Date().getMinutes() * 60 * 1000 - new Date().getSeconds() * 1000;
  const checkExpiry = async () => {
    try { await db('customs_coupons')
      .whereIn('status', ['issued', 'sent'])
      .where('month', '<', new Date(Date.now() - 62 * 86400000).toISOString().slice(0, 7))
      .update({ status: 'expired' });
    } catch {}
  };
  setTimeout(checkExpiry, msUntil1am);
  setInterval(checkExpiry, 24 * 60 * 60 * 1000);

  // 每日凌晨2:00发放企业订阅用户当月券
  const msUntil2am = (new Date().getHours() >= 2 ? 24 : 2 - new Date().getHours()) * 60 * 60 * 1000 - new Date().getMinutes() * 60 * 1000 - new Date().getSeconds() * 1000;
  const issueMonthly = async () => {
    try {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const subs = await db('monthly_subscriptions').where({ status: 'active' }).where('current_month', '<>', thisMonth).select('*');
      for (const sub of subs) {
        const { v4: uuid } = await import('uuid');
        const exists = await db('customs_coupons').where({ subscription_id: sub.id, month: thisMonth }).first();
        if (exists) continue;
        await db('customs_coupons').insert({
          id: uuid(), subscription_id: sub.id, forwarder_id: sub.user_id,
          face_value: 50.00, month: thisMonth, status: 'issued',
        });
        await db('monthly_subscriptions').where({ id: sub.id }).update({ current_month: thisMonth, last_paid_at: new Date().toISOString() });
      }
    } catch {}
  };
  setTimeout(issueMonthly, msUntil2am);
  setInterval(issueMonthly, 24 * 60 * 60 * 1000);

  logger.info(`Server running on http://localhost:${env.port}`);
  logger.info(`Environment: ${env.nodeEnv}`);
});
