import db from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 每小时检查一次

// 保存定时器引用以便停止
let intervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * 发送提醒通知到所有用户（含新注册用户，不发给被投诉公司本人）
 */
async function sendWarningToAll(alert: any) {
  const allUsers = await db('users').select('id', 'company_name').whereNotNull('id');
  const adminUsers = await db('users').where({ role: 'admin' }).select('id');

  // 管理员ID集合（不需要给自己发）
  const adminIds = new Set(adminUsers.map((a: any) => a.id));

  // 被投诉公司用户ID集合（不给他们发）
  const targetCompanyIds = new Set(
    allUsers
      .filter((u: any) => u.company_name === alert.target_company)
      .map((u: any) => u.id)
  );

  const message = `📢 群友提醒通知\n\n${alert.target_company} 被 ${alert.complaint_count} 家不同公司用户反馈提及，提醒大家合作前注意核实。\n\n具体反馈信息请到「吐槽专区」查看。\n\n本消息由管理员审核确认后发送。`;

  // 批量插入（每100条一批）
  const batch: any[] = [];
  for (const u of allUsers) {
    if (adminIds.has(u.id)) continue;
    if (targetCompanyIds.has(u.id)) continue;
    batch.push({
      id: uuidv4(),
      sender_id: alert.approved_by || adminUsers[0]?.id || 'system',
      receiver_id: u.id,
      content: message,
      is_read: false,
    });
    if (batch.length >= 100) {
      await db('messages').insert(batch);
      batch.length = 0;
    }
  }
  if (batch.length > 0) {
    await db('messages').insert(batch);
  }
  const sentCount = allUsers.length - adminIds.size - targetCompanyIds.size;

  logger.info(`⏰ 提醒通知定时重发：${alert.target_company}，已发送给 ${sentCount} 位用户（含新注册用户，已排除被投诉公司用户）`);
  return sentCount;
}

/**
 * 检查所有已批准的预警，看看哪些需要定时重发
 */
async function checkAndSend() {
  try {
    const now = new Date().toISOString();

    // 查找所有已批准 且 next_send_at <= now 的预警
    const alerts = await db('risk_alerts')
      .where({ status: 'approved' })
      .where('next_send_at', '<=', now)
      .whereNotNull('next_send_at')
      .limit(10);

    if (alerts.length === 0) return;

    logger.info(`⏰ 定时检查：发现 ${alerts.length} 条预警需要重发`);

    for (const alert of alerts) {
      await sendWarningToAll(alert);

      // 更新下次发送时间（再 +7 天）
      const nextSend = new Date(Date.now() + 7 * 86400000).toISOString();
      await db('risk_alerts')
        .where({ id: (alert as any).id })
        .update({
          last_sent_at: new Date().toISOString(),
          next_send_at: nextSend,
        });
    }
  } catch (err) {
    logger.error('⏰ 提醒通知定时重发检查失败:', err);
  }
}

/**
 * 启动定时检查器
 */
export function startRecurringWarningCheck(): void {
  if (intervalHandle) return; // 防止重复启动

  logger.info('⏰ 提醒通知定时重发服务已启动（每60分钟检查一次）');
  intervalHandle = setInterval(checkAndSend, CHECK_INTERVAL_MS);
}

/**
 * 停止定时检查器
 */
export function stopRecurringWarningCheck(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('⏰ 提醒通知定时重发服务已停止');
  }
}
