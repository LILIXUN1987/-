import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../utils/logger';

export const registerController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password, display_name, gender, company_name, phone, email, email_code, role, jc_trans_id, wca_id, ref, is_newbie, is_enterprise } = req.body;

      if (!username || !password || !display_name || !company_name) {
        return res.status(400).json({ error: '请填写所有必填项', code: 'MISSING_FIELDS' });
      }
      if (/admin/i.test(username)) {
        return res.status(400).json({ error: '用户名不能包含 admin', code: 'INVALID_USERNAME' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: '密码长度不能少于6位', code: 'WEAK_PASSWORD' });
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: '请填写有效的邮箱地址', code: 'INVALID_EMAIL' });
      }
      if (!email_code) {
        return res.status(400).json({ error: '请先获取邮箱验证码', code: 'MISSING_CODE' });
      }
      const { verifyCode } = await import('../services/email.service');
      const codeValid = await verifyCode(email, email_code);
      if (!codeValid) {
        return res.status(400).json({ error: '邮箱验证码错误或已过期', code: 'INVALID_CODE' });
      }
      if (role !== 'trader' && role !== 'overseas_agent' && !phone) {
        return res.status(400).json({ error: '请填写手机号', code: 'MISSING_PHONE' });
      }

      const existing = await db('users').where({ username }).first();
      if (existing) return res.status(400).json({ error: '该用户名已被注册', code: 'USERNAME_EXISTS' });

      const existingEmail = await db('users').where({ email }).first();
      if (existingEmail) return res.status(400).json({ error: '该邮箱已被注册', code: 'EMAIL_EXISTS' });

      if (phone) {
        const existingPhone = await db('users').where({ phone }).first();
        if (existingPhone) return res.status(400).json({ error: '该手机号已被注册', code: 'PHONE_EXISTS' });
      }

      // Handle uploaded files (card_image + license_image)
      let cardImagePath: string | null = null;
      let licenseImagePath: string | null = null;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      if (files?.card_image?.[0]) cardImagePath = files.card_image[0].path;
      else if ((req as any).file) cardImagePath = (req as any).file.path;
      if (files?.license_image?.[0]) licenseImagePath = files.license_image[0].path;

      const passwordHash = await bcrypt.hash(password, 12);
      const id = uuidv4();
      const { randomBytes } = await import('crypto');
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const refBytes = randomBytes(6);
      let referralCode = 'RF' + Array.from(refBytes, (b) => chars[b % chars.length]).join('');

      for (let attempt = 0; attempt < 5; attempt++) {
        const existingCode = await db('users').where({ referral_code: referralCode }).first();
        if (!existingCode) break;
        const retryBytes = randomBytes(6);
        referralCode = 'RF' + Array.from(retryBytes, (b) => chars[b % chars.length]).join('');
      }
      const finalCheck = await db('users').where({ referral_code: referralCode }).first();
      if (finalCheck) referralCode = 'RF' + Date.now().toString(36).toUpperCase();

      let hasReferrer = false;
      if (ref) {
        const referrer = await db('users').where({ referral_code: ref.toUpperCase() }).first();
        hasReferrer = !!referrer && referrer.id !== id;
      }
      // 海外代理赠送1个月标准版试用，到期自动降级免费版（5条/月）
      const isEnt = is_enterprise === true || is_enterprise === 'true';
      const isOverseasAgent = role === 'overseas_agent';
      const isBroker = role === 'broker';
      const bonusDays = hasReferrer ? 2 : 0;
      const planTier = isEnt ? 'enterprise' : (isBroker ? 'free' : (isOverseasAgent ? 'standard' : 'standard'));
      const isLawyer = role === 'lawyer';
      const isInspectorOrInsurer = role === 'inspector' || role === 'insurer';
      const trialEnd = (isLawyer || isInspectorOrInsurer) ? '2099-12-31' : (isBroker ? null : new Date(Date.now() + (30 + bonusDays) * 86400000).toISOString().split('T')[0]);

      await db('users').insert({
        id, username, password_hash: passwordHash,
        display_name, gender: gender || null, company_name, phone, email,
        email_verified: 1, card_image: cardImagePath,
        trial_end: trialEnd,
        plan_tier: planTier,
        company_verified: isEnt ? true : false,
        license_image: licenseImagePath,
        referral_code: referralCode,
        jc_trans_id: jc_trans_id || null, wca_id: wca_id || null,
        role: role || 'trader', status: 'approved', is_newbie: 1,
        registered_ip: req.ip || null,
      });

      // 货代新注册 → 自动加入考核计划（前200名）+ 自动创建订阅 + 首月券
      if ((role === 'forwarder' || role === 'enterprise_forwarder') && trialEnd) {
        // 考核计划：前200名货代自动加入
        const enrolledCount = await db('forwarder_probation').count('* as total').first() as any;
        const totalEnrolled = await db('forwarder_probation').select(db.raw('COUNT(DISTINCT user_id) as total')).first() as any;
        if (Number(totalEnrolled?.total || 0) < 200) {
          const now = new Date().toISOString();
          await db('forwarder_probation').insert({
            id: uuidv4(),
            user_id: id,
            month_number: 1,
            target_cargos: 15,
            target_queries: 20,
            actual_cargos: 0,
            actual_queries: 0,
            status: 'active',
            probation_month: now.slice(0, 7),
            created_at: now,
            updated_at: now,
          });
        }

        const month = new Date().toISOString().slice(0, 7);
        const subId = uuidv4();
        await db('monthly_subscriptions').insert({
          id: subId, user_id: id, status: 'active',
          current_month: month, amount: 0, last_paid_at: new Date().toISOString(),
        }).catch(() => {});
        await db('customs_coupons').insert({
          id: uuidv4(), subscription_id: subId, forwarder_id: id,
          face_value: 30.00, month, status: 'issued',
          created_at: new Date().toISOString(),
        }).catch(() => {});
      }

      // ── 通知管理员有新用户注册（站内信 + 邮件） ──
      try {
        const admins = await db('users').where({ role: 'admin' }).select('id', 'email', 'email_verified');
        const roleLabel: Record<string, string> = { forwarder: '货代', trader: '外贸', lawyer: '律师', inspector: '检测认证', insurer: '运输保险', overseas_agent: '海外代理', broker: '报关行' };
        const rl = roleLabel[role] || role;
        for (const a of admins) {
          await db('messages').insert({
            id: uuidv4(), sender_id: id, receiver_id: a.id,
            content: `👤 新用户注册通知\n\n${company_name || '未填公司'}（${display_name}）注册为${rl}${isEnt ? '（企业版）' : ''}。`,
            is_read: false, created_at: new Date().toISOString(),
          }).catch(() => {});
          // 邮件通知
          if (a.email && a.email_verified) {
            try {
              const nodemailer = require('nodemailer');
              const { env } = require('../config/env');
              const { getTransporter } = require('../services/email.service');
              const t = getTransporter();
              if (t) {
                await t.sendMail({
                  from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
                  to: a.email,
                  subject: `👤 新用户注册：${company_name || display_name}（${rl}）`,
                  text: `新用户注册通知\n\n公司：${company_name || '未填'}\n姓名：${display_name}\n角色：${rl}${isEnt ? '（企业版）' : ''}\n用户名：${username}\n时间：${new Date().toLocaleString('zh-CN')}\n\n请登录社区后台查看。`,
                });
              }
            } catch {}
          }
        }
      } catch {}

      // Referrer bonus
      if (hasReferrer && ref) {
        const referrer = await db('users').where({ referral_code: ref.toUpperCase() }).first() as any;
        if (referrer) {
          const currentEnd = referrer.trial_end || new Date().toISOString().split('T')[0];
          const newEnd = new Date(new Date(currentEnd + 'T23:59:59').getTime() + 2 * 86400000).toISOString().split('T')[0];
          await db('users').where({ id: referrer.id }).update({ trial_end: newEnd });
        }
      }

      res.json({ message: '注册成功' });
    } catch (err) {
      logger.error('注册失败:', err);
      next(err);
    }
  },
};
