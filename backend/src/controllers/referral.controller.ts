import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

export const referralController = {
  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await db('users').where({ id: userId }).first() as any;

      const refCount = await db('referrals')
        .where({ referrer_id: userId })
        .count('* as total')
        .first();

      const totalBonus = await db('referrals')
        .where({ referrer_id: userId })
        .sum('bonus_days as total')
        .first();

      // 当月推荐人数
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthCount = await db('referrals')
        .where({ referrer_id: userId })
        .where('created_at', '>=', monthStart.toISOString())
        .count('* as total')
        .first();

      res.json({
        referral_code: user.referral_code || '',
        total_referrals: Number((refCount as any)?.total || 0),
        total_bonus_days: Number((totalBonus as any)?.total || 0),
        month_referrals: Number((monthCount as any)?.total || 0),
        register_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${user.referral_code || ''}`,
      });
    } catch (err) {
      next(err);
    }
  },

  async history(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const referrals = await db('referrals')
        .join('users', 'referrals.referee_id', 'users.id')
        .where({ referrer_id: userId })
        .select(
          'referrals.id',
          'referrals.bonus_days',
          'referrals.created_at',
          'users.company_name',
          'users.display_name',
          'users.created_at as referee_created_at'
        )
        .orderBy('referrals.created_at', 'desc');

      res.json({ data: referrals });
    } catch (err) {
      next(err);
    }
  },

  async leaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      // 全部时间推荐排行榜
      const allTime = await db('referrals')
        .join('users', 'referrals.referrer_id', 'users.id')
        .select('users.display_name', 'users.company_name')
        .count('* as total')
        .sum('bonus_days as total_days')
        .groupBy('referrals.referrer_id')
        .orderBy('total', 'desc')
        .limit(10);

      // 本月推荐排行榜
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const thisMonth = await db('referrals')
        .join('users', 'referrals.referrer_id', 'users.id')
        .select('users.display_name', 'users.company_name')
        .count('* as total')
        .where('referrals.created_at', '>=', monthStart.toISOString())
        .groupBy('referrals.referrer_id')
        .orderBy('total', 'desc')
        .limit(10);

      res.json({ data: { allTime, thisMonth } });
    } catch (err) {
      next(err);
    }
  },

  async benefits(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await db('users').where({ id: userId }).first() as any;

      const refCount = await db('referrals')
        .where({ referrer_id: userId })
        .count('* as total')
        .first();
      const count = Number((refCount as any)?.total || 0);

      // 计算当前阶梯 (0=初始, 1=铜, 2=银, 3=金)
      let tier = 0;
      if (count >= 6) tier = 3;
      else if (count >= 3) tier = 2;
      else if (count >= 1) tier = 1;

      // 下一级还需多少人
      let nextTierAt = 0;
      if (tier === 0) nextTierAt = 1;
      else if (tier === 1) nextTierAt = 3;
      else if (tier === 2) nextTierAt = 6;
      else nextTierAt = count;

      const benefits = {
        referral_code: user.referral_code || '',
        referral_count: count,
        tier,
        tier_label: ['初始', '铜牌', '银牌', '金牌'][tier],
        next_tier_progress: Math.min(count, nextTierAt),
        next_tier_target: nextTierAt,
        // 外贸用户权益
        favorites_limit: count >= 1 ? 200 : 50,
        compare_limit: count >= 3 ? 20 : 5,
        has_subscription: count >= 5,
        // 货代权益
        current_bonus_per_person: count < 2 ? 3 : count < 5 ? 5 : 7,
        is_trader: user.role === 'trader',
      };

      res.json({ data: benefits });
    } catch (err) {
      next(err);
    }
  },

  async click(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.query.code as string;
      if (!code) {
        return res.status(400).json({ error: '缺少推荐码' });
      }

      // 记录点击
      await db('referral_clicks').insert({
        id: uuidv4(),
        referral_code: code.toUpperCase(),
        ip: req.ip || null,
        referrer_url: (req.headers['referer'] as string) || null,
        user_agent: (req.headers['user-agent'] as string) || null,
        created_at: new Date().toISOString(),
      });

      // 重定向到注册页
      const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${code}`;
      res.redirect(url);
    } catch (err) {
      next(err);
    }
  },

  async qrCode(req: Request, res: Response, next: NextFunction) {
    try {
      let user: any = null;
      // Support both authenticated user and ?code=xxx param
      if (req.user?.id) {
        user = await db('users').where({ id: req.user.id }).first() as any;
      } else if (req.query.code) {
        user = await db('users').where({ referral_code: (req.query.code as string).toUpperCase() }).first() as any;
      }
      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }
      const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${user.referral_code || ''}`;

      const qrBuffer = await QRCode.toBuffer(url, {
        width: 600,
        margin: 4,
        color: { dark: '#1e40af', light: '#ffffff' },
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(qrBuffer);
    } catch (err) {
      next(err);
    }
  },

  // ════════════════════════════════════════════
  // 推荐同行（填姓名+邮箱+公司 → 自动注册+发邮件）
  // ════════════════════════════════════════════
  async recommend(req: Request, res: Response, next: NextFunction) {
    try {
      const { referee_name, referee_email, referee_company } = req.body;
      if (!referee_name?.trim() || !referee_email?.trim()) {
        return res.status(400).json({ error: '请填写姓名和邮箱' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(referee_email)) {
        return res.status(400).json({ error: '邮箱格式不正确' });
      }

      const inviterId = req.user!.id;
      const inviter = await db('users').where({ id: inviterId }).first() as any;
      if (!inviter) return res.status(404).json({ error: '用户不存在' });

      const email = referee_email.trim().toLowerCase();

      // 检查是否已被推荐过
      const existingInvite = await db('peer_invitations')
        .where({ inviter_id: inviterId, referee_email: email })
        .first();
      if (existingInvite) {
        return res.status(400).json({
          error: '您已推荐过该同行，无需重复推荐（不纳入奖励计算）',
          code: 'ALREADY_INVITED',
        });
      }

      // 检查邮箱是否已注册
      const existingUser = await db('users').where({ email }).first();
      if (existingUser) {
        return res.status(400).json({
          error: `该邮箱（${email}）已在社区注册，推荐不纳入奖励计算`,
          code: 'ALREADY_REGISTERED',
        });
      }

      // 生成用户名+密码
      const username = email.split('@')[0];
      const nameExists = await db('users').where({ username }).first();
      const finalUsername = nameExists ? username + '_' + Math.random().toString(36).substring(2, 5) : username;

      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      const password = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const passwordHash = await bcrypt.hash(password, 12);

      // 计算阶梯奖励
      const existingCount = await db('referrals')
        .where({ referrer_id: inviterId })
        .count('* as total')
        .first();
      const alreadyRecommended = await db('peer_invitations')
        .where({ inviter_id: inviterId, status: 'registered' })
        .count('* as total')
        .first() as any;
      const totalCount = Number((existingCount as any)?.total || 0) + Number(alreadyRecommended?.total || 0);
      let bonusDays: number;
      if (totalCount < 2) bonusDays = 3;
      else if (totalCount < 5) bonusDays = 5;
      else bonusDays = 7;

      const trialEnd = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const newUserId = uuidv4();

      // 创建用户
      await db('users').insert({
        id: newUserId,
        username: finalUsername,
        password_hash: passwordHash,
        display_name: referee_name.trim(),
        company_name: referee_company?.trim() || null,
        email,
        email_verified: 1,
        role: 'forwarder',
        status: 'approved',
        trial_end: trialEnd,
        referral_code: 'RF' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 记录推荐
      const inviteId = uuidv4();
      await db('peer_invitations').insert({
        id: inviteId,
        inviter_id: inviterId,
        referee_name: referee_name.trim(),
        referee_email: email,
        referee_company: referee_company?.trim() || null,
        referee_username: finalUsername,
        referee_password: password,
        referee_id: newUserId,
        status: 'registered',
        bonus_days: bonusDays,
      });

      // 写入 referrals 表（和推荐码系统共用）
      await db('referrals').insert({
        id: uuidv4(),
        referrer_id: inviterId,
        referee_id: newUserId,
        bonus_days: bonusDays,
      });

      // 延长邀请人试用期
      const currentEnd = inviter.trial_end || new Date().toISOString().split('T')[0];
      const newEnd = new Date(currentEnd + 'T23:59:59');
      newEnd.setDate(newEnd.getDate() + bonusDays);
      await db('users').where({ id: inviter.id }).update({ trial_end: newEnd.toISOString().split('T')[0] });

      // 发送开通邮件
      try {
        const { sendAccountActivationEmail } = await import('../services/email.service');
        await sendAccountActivationEmail(email, referee_name.trim(), referee_company?.trim() || '', finalUsername, password);
      } catch (err) {
        logger.error(`发送推荐注册邮件失败 ${email}:`, err);
      }

      // 站内信通知邀请人
      try {
        const adminUser = await db('users').where({ username: 'admin' }).first();
        if (adminUser) {
          await db('messages').insert({
            id: uuidv4(),
            sender_id: adminUser.id,
            receiver_id: inviterId,
            content: [
              `🎉 同行推荐成功！`,
              ``,
              `被推荐人：${referee_name.trim()}（${referee_company?.trim() || ''}）`,
              `邮箱：${email}`,
              `用户名：${finalUsername}`,
              `密码：${password}`,
              ``,
              `🎁 您获得 +${bonusDays} 天试用期延长（阶梯奖励）`,
              `当前累计推荐：${totalCount + 1} 人`,
              ``,
              `系统已自动为该同行创建账号并发送了开通邮件，对方登录即可使用。`,
            ].join('\n'),
            is_read: 0,
            created_at: new Date().toISOString(),
          });
        }
      } catch (msgErr) {}

      res.status(201).json({
        message: `✅ 推荐成功！已为 ${referee_name.trim()} 创建账号并发送邮件，您获得 +${bonusDays} 天奖励`,
        username: finalUsername,
        bonus_days: bonusDays,
      });
    } catch (err) { next(err); }
  },

  // ── 我的推荐记录 ──
  async recommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('peer_invitations')
        .where({ inviter_id: req.user!.id })
        .orderBy('created_at', 'desc')
        .limit(50);
      res.json({ data });
    } catch (err) { next(err); }
  },
};
