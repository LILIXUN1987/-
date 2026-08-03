// 设置时区为中国北京时间
process.env.TZ = 'Asia/Shanghai';

import db from './config/database';
import app from './app';
import { env } from './config/env';
import logger from './utils/logger';
import { startRecurringWarningCheck } from './services/recurringWarning.service';
import { updateProbationStats, evaluateProbation } from './services/probation.service';

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

  // 舱位数据全部保留（valid_to 控制展示），不自动删除
  // await cleanExpiredCargoSpaces();
}

/** 舱位信息：不自动删除（社区初期数据少，全部保留。过期由 valid_to 控制展示） */
async function cleanExpiredCargoSpaces() {
  // 社区起步阶段，数据弥足珍贵，不删。
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
      const shouldRepeat = createdTime < (now.getTime() - 14 * 86400000) && lastReminderTime > 0 && (now.getTime() - lastReminderTime) >= 14 * 86400000;
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

    // 7天内到期且上次提醒是7天前
    const sevenDaysAgo2 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const expiringSoon = await db('users')
      .whereIn('role', ['forwarder', 'inspector', 'insurer'])
      .whereNotNull('trial_end')
      .where('trial_end', '>=', today)
      .where('trial_end', '<=', sevenDaysLater)
      .where(function () {
        this.whereNull('last_reminder_at').orWhere('last_reminder_at', '<', sevenDaysAgo2);
      })
      .select('id', 'display_name', 'email', 'trial_end', 'email_verified', 'last_reminder_at') as any[];

    // 已过期但上次提醒不是今天（每7天发一次）
    const sevenDaysAgo3 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const expired = await db('users')
      .whereIn('role', ['forwarder', 'inspector', 'insurer'])
      .whereNotNull('trial_end')
      .where('trial_end', '<', today)
      .where(function () {
        this.whereNull('last_reminder_at').orWhere('last_reminder_at', '<', sevenDaysAgo3);
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

/** 海外代理标准版试用升级提醒：每7天发一次英文邮件 */
async function remindOverseasExpiringUsers() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

    // 正在试用标准版的海外代理（last_reminder_at > 14天前，或从未提醒过）
    const users = await db('users')
      .where({ role: 'overseas_agent', plan_tier: 'standard' })
      .whereNotNull('trial_end')
      .where(function () {
        this.whereNull('last_reminder_at').orWhere('last_reminder_at', '<', fourteenDaysAgo);
      })
      .select('id', 'display_name', 'email', 'trial_end', 'email_verified') as any[];

    if (users.length === 0) return;

    const { sendOverseasUpgradeReminderEmail } = await import('./services/email.service');
    let sentCount = 0;

    for (const user of users) {
      if (!user.email || !user.email_verified) continue;
      const remaining = user.trial_end
        ? Math.ceil((new Date(user.trial_end + 'T23:59:59').getTime() - Date.now()) / 86400000)
        : 0;
      try {
        await sendOverseasUpgradeReminderEmail(user.email, user.display_name, user.trial_end || '', Math.max(0, remaining));
        await db('users').where({ id: user.id }).update({ last_reminder_at: new Date().toISOString() });
        sentCount++;
      } catch (e) { logger.error(`海外代理升级提醒发送给 ${user.email} 失败:`, e); }
    }
    if (sentCount > 0) logger.info(`海外代理升级提醒: 已发送 ${sentCount} 封邮件`);
  } catch (err) { logger.error('海外代理升级提醒任务失败:', err); }
}

app.listen(env.port, async () => {
  // 启动后延迟1小时再执行首次清理，避免重启丢数据
  setTimeout(cleanOldData, 60 * 60 * 1000);
  setInterval(cleanOldData, CLEANUP_INTERVAL);
  // 舱位清理：每6小时检查一次，清除7天前的数据
  setInterval(cleanExpiredCargoSpaces, 6 * 60 * 60 * 1000);
  // 未登录用户提醒：每24小时检查一次
  setInterval(remindInactiveUsers, 24 * 60 * 60 * 1000);
  setTimeout(remindInactiveUsers, 6 * 60 * 60 * 1000); // 启动后6小时首次检查
  // 舱位清理已停用（社区初期全部保留）
  // setInterval(cleanExpiredCargoSpaces, 6 * 60 * 60 * 1000);
  // 会员到期提醒：每天8:00检查一次
  const msUntil8am = (new Date().getHours() >= 8 ? 24 : 8 - new Date().getHours()) * 60 * 60 * 1000 - new Date().getMinutes() * 60 * 1000 - new Date().getSeconds() * 1000;
  setTimeout(() => { remindExpiringUsers(); setInterval(remindExpiringUsers, 48 * 60 * 60 * 1000); }, msUntil8am);
  // 海外代理每7天升级提醒：每天8:30检查一次
  const nowH = new Date().getHours(), nowM = new Date().getMinutes(), nowS = new Date().getSeconds();
  const msUntil830 = ((nowH >= 8 && nowM >= 30) || nowH > 8 ? 24 + 8 : 8) * 3600000 - nowH * 3600000 - nowM * 60000 - nowS * 1000 + 30 * 60000;
  setTimeout(() => { remindOverseasExpiringUsers(); setInterval(remindOverseasExpiringUsers, 24 * 60 * 60 * 1000); }, Math.max(msUntil830, 10000));
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
        // 加权随机：¥50仅10%，¥30/¥20/¥10各30%
        const r = Math.random() * 100;
        const fv = r < 10 ? 50 : r < 40 ? 30 : r < 70 ? 20 : 10;
        await db('customs_coupons').insert({
          id: uuid(), subscription_id: sub.id, forwarder_id: sub.user_id,
          face_value: fv, month: thisMonth, status: 'issued',
        });
        await db('monthly_subscriptions').where({ id: sub.id }).update({ current_month: thisMonth, last_paid_at: new Date().toISOString() });
      }
    } catch {}
  };
  setTimeout(issueMonthly, msUntil2am);
  setInterval(issueMonthly, 24 * 60 * 60 * 1000);

  // ── 每日凌晨3:00检查过期券（sent超过30天+issued超过30天） ──
  const msUntil3am = ((new Date().getHours() >= 3 ? 24 : 3 - new Date().getHours()) * 60 * 60 * 1000) - new Date().getMinutes() * 60 * 1000 - new Date().getSeconds() * 1000;
  const expireStaleCoupons = async () => {
    try {
      const { default: db } = await import('./config/database');
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      // 仅过期 sent 状态的券（已领取但30天未核销），issued池中券永不过期
      const expired = await db('customs_coupons').where('status', 'sent').where('sent_at', '<', thirtyDaysAgo).update({ status: 'expired' });
      if (expired > 0) logger.info(`[cron] 券过期处理：${expired} 张已领取未核销券已过期`);
    } catch (err) { logger.error('[cron] 券过期处理失败:', err); }
  };
  setTimeout(expireStaleCoupons, msUntil3am);
  setInterval(expireStaleCoupons, 24 * 60 * 60 * 1000);

  // ── 每周一早上9点发送货代周报 ──
  const dayOfWeek = new Date().getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  const msUntilMonday9am = daysUntilMonday * 86400000 + (9 - new Date().getHours()) * 3600000 - new Date().getMinutes() * 60000;
  const sendWeeklyReports = async () => {
    try {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const totalSearches = Number(((await db('search_logs').where('created_at', '>=', weekAgo).count('* as total').first()) as any)?.total || 0);
      const totalMatches = Number(((await db('messages').where('created_at', '>=', weekAgo).where('content', 'like', '%🎯%').count('* as total').first()) as any)?.total || 0);
      const hotRows = await db('search_logs').where('created_at', '>=', weekAgo).whereNotNull('keyword').select('keyword').select(db.raw('COUNT(*) as cnt')).groupBy('keyword').orderBy('cnt', 'desc').limit(5) as any[];
      const hk = hotRows.map((r: any) => r.keyword);
      const fwds = await db('users').where({ role: 'forwarder', status: 'approved' }).whereNotNull('email').select('id', 'email', 'display_name', 'company_name') as any[];
      const { sendWeeklyReport } = await import('./services/email.service');
      for (const f of fwds) {
        if (!f.email) continue;
        try {
          const myStats = await db('cargo_spaces').where('uploaded_by', f.id).select(db.raw('SUM(view_count) as views'), db.raw('SUM(inquiry_count) as inquiries')).first() as any;
          await sendWeeklyReport(f.email, f.display_name || f.company_name, {
            totalSearches, totalMatches,
            yourViews: Number(myStats?.views || 0), yourInquiries: Number(myStats?.inquiries || 0),
            hotKeywords: hk,
          });
        } catch {}
      }
      logger.info(`周报已发送给 ${fwds.length} 位货代`);
    } catch (e) { logger.error('周报发送失败:', e); }
  };
  setTimeout(sendWeeklyReports, Math.max(msUntilMonday9am, 60000));
  setInterval(sendWeeklyReports, 7 * 86400000);

  // ── 货代考核：每日凌晨4:00更新数据，月底评估 ──
  const msUntil4am = ((new Date().getHours() >= 4 ? 24 : 4 - new Date().getHours()) * 60 * 60 * 1000) - new Date().getMinutes() * 60 * 1000 - new Date().getSeconds() * 1000;
  const runProbation = async () => {
    try { await updateProbationStats(); } catch (e) { logger.error('[probation] 更新考核数据失败:', e); }
    try { await evaluateProbation(); } catch (e) { logger.error('[probation] 月底评估失败:', e); }
  };
  setTimeout(runProbation, msUntil4am);
  setInterval(runProbation, 24 * 60 * 60 * 1000);

  logger.info(`Server running on http://localhost:${env.port}`);
  logger.info(`Environment: ${env.nodeEnv}`);
});
