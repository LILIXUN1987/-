import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../utils/logger';
import { sendInvitationEmail } from '../services/email.service';

export const inviteController = {
  // ── 邀请海外代理 ──
  async invite(req: Request, res: Response, next: NextFunction) {
    try {
      const { agent_email, agent_name, inviter_english_name, inviter_english_company } = req.body;
      if (!agent_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agent_email)) {
        return res.status(400).json({ error: '请填写有效的邮箱地址' });
      }
      if (!inviter_english_name?.trim()) {
        return res.status(400).json({ error: '请填写您的英文姓名，老外需要知道您是谁' });
      }

      const inviterId = req.user!.id;
      const inviter = await db('users').where({ id: inviterId }).first() as any;
      if (!inviter) return res.status(404).json({ error: '用户不存在' });

      // 检查该邮箱是否已被邀请过
      const existing = await db('agent_invitations')
        .where({ agent_email: agent_email.toLowerCase().trim(), inviter_id: inviterId })
        .whereNot('status', 'expired')
        .first();
      if (existing) {
        return res.json({ message: '该邮箱已被邀请，无需重复发送' });
      }

      // 检查该邮箱是否已注册
      const registered = await db('users').where({ email: agent_email.toLowerCase().trim() }).first();
      if (registered) {
        return res.json({ message: '该邮箱已注册社区账号，无需再次邀请' });
      }

      const id = uuidv4();
      const email = agent_email.toLowerCase().trim();
      const name = agent_name?.trim() || '';

      await db('agent_invitations').insert({
        id,
        inviter_id: inviterId,
        agent_email: email,
        agent_name: name,
        inviter_english_name: inviter_english_name.trim(),
        inviter_english_company: inviter_english_company?.trim() || null,
        status: 'pending',
      });

      // 发送邀请邮件（使用英文名/公司）
      const frontendUrl = process.env.FRONTEND_URL || 'https://123cargo123.com';
      const registerUrl = `${frontendUrl}/register?ref=${inviter.referral_code || ''}&email=${encodeURIComponent(email)}`;

      try {
        await sendInvitationEmail({
          toEmail: email,
          agentName: name || email.split('@')[0],
          inviterName: inviter_english_name.trim(),
          inviterCompany: inviter_english_company?.trim() || '',
          registerUrl,
        });
        logger.info(`邀请邮件已发送至 ${email}`);
      } catch (err) {
        logger.error(`发送邀请邮件失败 ${email}:`, err);
      }

      // ── 发送即送：邀请人立即获得 +15 天 ──
      if (inviter.trial_end) {
        const inviterEnd = new Date(inviter.trial_end + 'T23:59:59');
        const now = new Date();
        const newEnd = inviterEnd > now ? inviterEnd : now;
        newEnd.setDate(newEnd.getDate() + 15);
        await db('users').where({ id: inviter.id }).update({ trial_end: newEnd.toISOString().split('T')[0] });
        logger.info(`邀请人 ${inviter.username} 获得 +15 天奖励`);
      }

      res.status(201).json({ message: '邀请已发送，+15天试用期已到账', id });
    } catch (err) { next(err); }
  },

  // ── 我的邀请记录 ──
  async myInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('agent_invitations')
        .where({ inviter_id: req.user!.id })
        .orderBy('created_at', 'desc')
        .limit(50);
      res.json({ data });
    } catch (err) { next(err); }
  },
};
