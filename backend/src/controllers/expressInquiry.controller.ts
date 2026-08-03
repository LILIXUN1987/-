import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../utils/logger';
import { sendInquiryNotification } from '../services/email.service';

export const expressInquiryController = {
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { keyword } = req.body;
      if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
        return res.status(400).json({ error: '请输入查询信息' });
      }

      const senderId = req.user?.id;
      const senderName = (req.user as any)?.display_name || '';
      const kw = keyword.trim().substring(0, 200);

      // 1. 发送站内信给管理员 + YXD
      const admin = await db('users').where({ role: 'admin' }).first() as any;
      const yxd = await db('users').where({ username: 'YXD' }).first() as any;
      const receivers = [admin, yxd].filter(Boolean);
      for (const r of receivers) {
        await db('messages').insert({
          id: uuidv4(),
          sender_id: senderId || 'system',
          receiver_id: r.id,
          content: `📦 香港快递出口实时询价（DHL/FEDEX/UPS）：「${kw}」—— 客户 ${senderName} 已通过香港快递账户发起询价，请及时回复报价。`,
          is_read: false,
        });
      }
      logger.info(`快递询价已推送站内信给 ${receivers.length} 人: "${kw.substring(0, 30)}..."`);

      // 2. 发送邮件给指定邮箱
      const emailTargets = ['190749693@qq.com', 'express@tiangaocargo.com'];
      for (const email of emailTargets) {
        try {
          await sendInquiryNotification(email, '管理员', senderName || '查询者', kw);
          logger.info(`快递询价已发送邮件至 ${email}`);
        } catch (err) { logger.error(`发送邮件至 ${email} 失败:`, err); }
      }

      res.json({
        message: '✅ 您的快递实时询价已提交成功，请随后在左侧侧边栏「收件箱」查收报价回复',
        pushed: true,
      });
    } catch (err) {
      next(err);
    }
  },
};
