import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../utils/logger';

export const registerController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password, display_name, gender, company_name, phone, email, email_code, role, jc_trans_id, wca_id, ref, is_newbie } = req.body;

      if (!username || !password || !display_name || !company_name) {
        return res.status(400).json({
          error: '请填写所有必填项',
          code: 'MISSING_FIELDS',
        });
      }

      // 用户名不允许包含 admin（防止冒充管理员）
      if (/admin/i.test(username)) {
        return res.status(400).json({ error: '用户名不能包含 admin', code: 'INVALID_USERNAME' });
      }

      // 密码强度验证
      if (password.length < 6) {
        return res.status(400).json({ error: '密码长度不能少于6位', code: 'WEAK_PASSWORD' });
      }

      // 所有用户必须填写邮箱
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: '请填写有效的邮箱地址', code: 'INVALID_EMAIL' });
      }

      // 验证邮箱验证码
      if (!email_code) {
        return res.status(400).json({ error: '请先获取邮箱验证码', code: 'MISSING_CODE' });
      }
      const { verifyCode } = await import('../services/email.service');
      const codeValid = await verifyCode(email, email_code);
      if (!codeValid) {
        return res.status(400).json({ error: '邮箱验证码错误或已过期', code: 'INVALID_CODE' });
      }

      // 外贸行业/海外代理不强制要求手机号（保护隐私）
      if (role !== 'trader' && role !== 'overseas_agent' && !phone) {
        return res.status(400).json({
          error: '请填写手机号',
          code: 'MISSING_PHONE',
        });
      }

      // Check if username already exists
      const existing = await db('users').where({ username }).first();
      if (existing) {
        return res.status(400).json({ error: '该用户名已被注册', code: 'USERNAME_EXISTS' });
      }

      // Check if email already exists
      const existingEmail = await db('users').where({ email }).first();
      if (existingEmail) {
        return res.status(400).json({ error: '该邮箱已被注册', code: 'EMAIL_EXISTS' });
      }

      // Check if phone already exists（仅当填了手机号时检查）
      if (phone) {
        const existingPhone = await db('users').where({ phone }).first();
        if (existingPhone) {
          return res.status(400).json({ error: '该手机号已被注册', code: 'PHONE_EXISTS' });
        }
      }

      // Handle business card image
      let cardImagePath: string | null = null;
      if (req.file) {
        cardImagePath = req.file.path;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const id = uuidv4();
      // 生成随机推荐码（RF + 6位大写字母数字，使用加密安全随机）
      const { randomBytes } = await import('crypto');
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const refBytes = randomBytes(6);
      let referralCode = 'RF' + Array.from(refBytes, (b) => chars[b % chars.length]).join('');

      // 校验推荐码唯一性（最多重试 5 次）
      for (let attempt = 0; attempt < 5; attempt++) {
        const existingCode = await db('users').where({ referral_code: referralCode }).first();
        if (!existingCode) break;
        const retryBytes = randomBytes(6);
        referralCode = 'RF' + Array.from(retryBytes, (b) => chars[b % chars.length]).join('');
      }

      // 是否有推荐人（双边奖励：新人也得+2天）
      let hasReferrer = false;
      if (ref) {
        const referrer = await db('users').where({ referral_code: ref.toUpperCase() }).first();
        hasReferrer = !!referrer && referrer.id !== id;
      }
      const bonusDays = hasReferrer ? 2 : 0;
      // 律师不设置体验期，永久有效
      let trialEnd: string;
      if (role === 'lawyer') {
        trialEnd = '2099-12-31'; // 永久有效
      } else if (role === 'overseas_agent') {
        trialEnd = new Date(Date.now() + (30 + bonusDays) * 86400000).toISOString().split('T')[0];
      } else {
        trialEnd = new Date(Date.now() + (30 + bonusDays) * 86400000).toISOString().split('T')[0];
      }
      await db('users').insert({
        id,
        username,
        password_hash: passwordHash,
        display_name,
        gender: gender || null,
        company_name,
        phone,
        email,
        email_verified: 1,
        card_image: cardImagePath,
        trial_end: trialEnd,
        referral_code: referralCode,
        jc_trans_id: jc_trans_id || null,
        wca_id: wca_id || null,
        role: role || 'trader',
        status: 'approved',
        is_newbie: is_newbie === true || is_newbie === 'true' ? 1 : 0,
        registered_ip: req.ip || null,
      });

      // ── 如果是推荐注册（阶梯奖励 + 双边奖励 + 站内信通知） ──
      if (ref) {
        const referrer = await db('users').where({ referral_code: ref.toUpperCase() }).first();
        if (referrer && referrer.id !== id) {
          // 计算阶梯奖励
          const existingCount = await db('referrals')
            .where({ referrer_id: referrer.id })
            .count('* as total')
            .first();
          const count = Number((existingCount as any)?.total || 0);
          let referrerBonus: number;
          if (count < 2) referrerBonus = 3;        // 第1~2人: +3天
          else if (count < 5) referrerBonus = 5;   // 第3~5人: +5天
          else referrerBonus = 7;                  // 第6人+: +7天

          // 写入推荐记录
          await db('referrals').insert({ id: uuidv4(), referrer_id: referrer.id, referee_id: id, bonus_days: referrerBonus });

          // 延长推荐人体验期
          const currentEnd = referrer.trial_end || new Date().toISOString().split('T')[0];
          const newEnd = new Date(currentEnd + 'T23:59:59');
          newEnd.setDate(newEnd.getDate() + referrerBonus);
          await db('users').where({ id: referrer.id }).update({ trial_end: newEnd.toISOString().split('T')[0] });

          // ── 发送站内信通知推荐人 ──
          try {
            const adminUser = await db('users').where({ username: 'admin' }).first();
            if (adminUser) {
              const messageContent = [
                `🎉 恭喜！新用户通过您的推荐加入了社区！`,
                `被推荐人：${display_name}（${company_name}）`,
                ``,
                `🎁 您获得 +${referrerBonus} 天体验期奖励（阶梯奖励）`,
                `当前累计延长：${count + 1} 人，总奖励天数累积中`,
                ``,
                `继续分享您的推荐码，邀请更多同行加入！`,
              ].join('\n');
              await db('messages').insert({
                id: uuidv4(),
                sender_id: adminUser.id,
                receiver_id: referrer.id,
                content: messageContent,
                is_read: 0,
                created_at: new Date().toISOString(),
              });
            }
          } catch (msgErr) {
            // 通知发送失败不影响主流程
          }

          // ── 如果新人也有 trial_end（+2天已在前面处理），发送欢迎通知 ──
          try {
            const adminUser = await db('users').where({ username: 'admin' }).first();
            if (adminUser) {
              const welcomeContent = [
                `🎁 欢迎加入 123 共享外贸物流社区！`,
                ``,
                `您是通过好友 ${referrer.display_name}（${referrer.company_name}）的推荐链接注册的，`,
                `已额外获得 2 天免费体验期！`,
                ``,
                `现在开始查询全球舱位信息吧！`,
              ].join('\n');
              await db('messages').insert({
                id: uuidv4(),
                sender_id: adminUser.id,
                receiver_id: id,
                content: welcomeContent,
                is_read: 0,
                created_at: new Date().toISOString(),
              });
            }
          } catch (msgErr) {}
        }
      }

      // ── 如果是通过海外代理邀请注册的（邀请奖励） ──
      if (email) {
        const invitation = await db('agent_invitations')
          .where({ agent_email: email, status: 'pending', reward_granted: false })
          .first() as any;
        if (invitation) {
          try {
            // 延长海外代理体验期至60天（默认30+2，再加28天凑60）
            const extraDays = 60 - 30 - (hasReferrer ? 2 : 0);
            if (extraDays > 0) {
              const currentEnd = trialEnd;
              const newEnd = new Date(currentEnd + 'T23:59:59');
              newEnd.setDate(newEnd.getDate() + extraDays);
              await db('users').where({ id }).update({ trial_end: newEnd.toISOString().split('T')[0] });
            }

            // 延长邀请人体验期 +45天
            const inviter = await db('users').where({ id: invitation.inviter_id }).first() as any;
            if (inviter) {
              const inviterEnd = inviter.trial_end
                ? new Date(inviter.trial_end + 'T23:59:59')
                : new Date();
              const now = new Date();
              const inviterNewEnd = inviterEnd > now ? inviterEnd : now;
              inviterNewEnd.setDate(inviterNewEnd.getDate() + 45);
              await db('users').where({ id: inviter.id }).update({ trial_end: inviterNewEnd.toISOString().split('T')[0] });
            }

            // 更新邀请记录
            await db('agent_invitations')
              .where({ id: invitation.id })
              .update({ invitee_user_id: id, status: 'registered', reward_granted: true });

            // ── 自动创建合作记录（邀请人 ↔ 海外代理） ──
            const existingCoop = await db('cooperations')
              .where({ agent_user_id: id, forwarder_user_id: invitation.inviter_id })
              .first();
            if (!existingCoop) {
              await db('cooperations').insert({
                id: uuidv4(),
                agent_user_id: id,
                forwarder_user_id: invitation.inviter_id,
                agent_company: company_name || null,
                forwarder_company: inviter?.company_name || null,
                status: 'confirmed',
                confirmed_at: db.fn.now(),
                description: '邀请注册自动建立',
              });
            }

            // 通知邀请人
            const adminUser = await db('users').where({ username: 'admin' }).first();
            if (adminUser && inviter) {
              await db('messages').insert({
                id: uuidv4(),
                sender_id: adminUser.id,
                receiver_id: inviter.id,
                content: [
                  `🎉 您邀请的海外代理已成功注册！`,
                  ``,
                  `被邀请人：${display_name}（${company_name || ''}）`,
                  `邮箱：${email}`,
                  ``,
                  `🎁 您获得 +15 天试用期延长！`,
                  `对方获得 +60 天免费体验期！`,
                  ``,
                  `现在可以去「海外DDP到门」页面查看并联系该代理，`,
                  `登记合作，进一步拓展您的国际网络。`,
                ].join('\n'),
                is_read: 0,
                created_at: new Date().toISOString(),
              });
            }
          } catch (rewardErr) {
            logger.error('发放邀请奖励失败:', rewardErr);
          }
        }
      }

      res.status(201).json({
        message: 'Registered successfully! Welcome to the community.',
        user: { id, username, display_name, company_name, phone, email, status: 'approved' },
      });
    } catch (err) {
      next(err);
    }
  },
};
