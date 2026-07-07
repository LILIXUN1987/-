import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../utils/logger';
import { requireAdmin } from './admin.controller';

export const riskAlertController = {
  // 获取待审批的风险预警
  async pending(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      const data = await db('risk_alerts')
        .where({ status: 'pending' })
        .orderBy('created_at', 'desc')
        .limit(20);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  // 获取历史记录
  async history(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      const data = await db('risk_alerts')
        .orderBy('created_at', 'desc')
        .limit(50);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  // 管理员批准 → 群发提醒通知
  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      const alertId = req.params.id;
      const alert = await db('risk_alerts').where({ id: alertId }).first() as any;
      if (!alert) return res.status(404).json({ error: '风险预警不存在' });
      if (alert.status !== 'pending') return res.status(400).json({ error: '该预警已处理' });

      const now = new Date();
      const nextSend = new Date(now.getTime() + 7 * 86400000).toISOString();
      await db('risk_alerts').where({ id: alertId }).update({
        status: 'approved',
        approved_by: req.user!.id,
        processed_at: db.fn.now(),
        last_sent_at: now.toISOString(),
        next_send_at: nextSend,
      });

      // 群发提醒通知（批量插入，支持并发）
      const allUsers = await db('users').select('id', 'company_name', 'role').whereNotNull('id');
      const targetCompanyUsers = allUsers
        .filter((u: any) => u.company_name === alert.target_company)
        .map((u: any) => u.id);
      const adminIds = allUsers.filter((u: any) => u.role === 'admin').map((u: any) => u.id);
      const targetIds = new Set([...targetCompanyUsers, ...adminIds]);
      const message = `📢 群友提醒通知\n\n${alert.target_company} 被 ${alert.complaint_count} 家不同公司用户反馈提及，提醒大家合作前注意核实。\n\n具体反馈信息请到「吐槽专区」查看。\n\n本消息由管理员审核确认后发送。`;

      for (let round = 0; round < 3; round++) {
        const batch: any[] = [];
        for (const u of allUsers) {
          if (targetIds.has(u.id)) continue;
          batch.push({
            id: uuidv4(),
            sender_id: req.user!.id,
            receiver_id: u.id,
            content: message,
            is_read: false,
            created_at: new Date().toISOString(),
          });
          // 每100条批量插入一次
          if (batch.length >= 100) {
            await db('messages').insert(batch);
            batch.length = 0;
          }
        }
        if (batch.length > 0) {
          await db('messages').insert(batch);
        }
      }

      logger.info(`⚠️ 管理员已批准风险预警：${alert.target_company}，群发 3 轮给 ${allUsers.length - 1 - targetCompanyUsers.length} 位用户（已排除被投诉公司 ${targetCompanyUsers.length} 人）`);
      res.json({ message: '已批准，提醒通知已群发', total_recipients: allUsers.length - 1 });
    } catch (err) {
      next(err);
    }
  },

  // 获取已批准的提醒通知（供前台展示 — 公开）
  async approved(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('risk_alerts')
        .where({ status: 'approved' })
        .orderBy('created_at', 'desc')
        .limit(50);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  // 管理员拒绝
  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      await db('risk_alerts').where({ id: req.params.id }).update({ status: 'rejected', approved_by: req.user!.id, processed_at: db.fn.now() });
      res.json({ message: '已拒绝该风险预警' });
    } catch (err) {
      next(err);
    }
  },
};
