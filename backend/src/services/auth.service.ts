import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database';
import { env } from '../config/env';
import { User, UserPublic } from '../types';
import { UnauthorizedError } from '../utils/errors';

function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    company_name: user.company_name,
    phone: user.phone,
    email: (user as any).email,
    email_verified: (user as any).email_verified,
    notify_inquiry_email: (user as any).notify_inquiry_email,
    notify_inquiry_site: (user as any).notify_inquiry_site,
    notify_all_messages_email: (user as any).notify_all_messages_email ?? false,
    gender: user.gender,
    card_image: user.card_image,
    jc_trans_id: user.jc_trans_id,
    wca_id: user.wca_id,
    trial_end: user.trial_end,
    referral_code: user.referral_code,
    role: user.role,
    status: user.status,
    is_verified_company: (user as any).is_verified_company === 1 || (user as any).is_verified_company === true,
    company_license: (user as any).company_license || null,
    avatar: (user as any).avatar || null,
    bio: (user as any).bio || null,
    is_newbie: (user as any).is_newbie ? 1 : 0,
    port_city: (user as any).port_city || null,
    port_code: (user as any).port_code || null,
    operable_ports: (user as any).operable_ports || null,
    created_at: user.created_at,
  };
}

export const authService = {
  /** Unified login - accepts username or email */
  async login(account: string, password: string) {
    const user = await db('users')
      .where({ username: account })
      .orWhere({ email: account })
      .first();
    if (!user) {
      throw new UnauthorizedError('用户名或密码错误');
    }
    const status = (user as any).status;
    if (status === 'pending') {
      throw new UnauthorizedError('账号审核中，请等待管理员审核');
    }
    if (status === 'suspended' || status === 'banned') {
      throw new UnauthorizedError('账号已被禁用，请联系管理员');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    const tokenVersion = (user as any).token_version ?? 0;

    // 记录最后登录时间
    await db('users').where({ id: user.id }).update({ last_login_at: new Date().toISOString() });

    const token = jwt.sign(
      { id: user.id, username: user.username, display_name: user.display_name, role: (user as any).role, token_version: tokenVersion },
      env.jwt.secret,
      { expiresIn: '24h' as const }
    );

    // ── 查询同公司同事名单 ──
    let companyMates: { display_name: string; role: string }[] = [];
    const companyName = (user as any).company_name;
    if (companyName) {
      const mates = await db('users')
        .where('company_name', companyName)
        .whereNot('id', user.id)
        .whereNot('status', 'banned')
        .select('display_name', 'role')
        .limit(10);
      companyMates = mates.map((m: any) => ({ display_name: m.display_name, role: m.role || '' }));
    }

    return {
      token,
      user: { ...toPublicUser(user as any), role: (user as any).role },
      company_mates_count: companyMates.length,
      company_mates: companyMates,
    };
  },

  async getMe(userId: string) {
    const user = await db<User>('users').where({ id: userId }).first();
    if (!user) {
      throw new UnauthorizedError('用户不存在');
    }
    return toPublicUser(user);
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await db('users').where({ id: userId }).first() as any;
    if (!user) throw new UnauthorizedError('用户不存在');

    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) throw new UnauthorizedError('原密码错误');

    if (newPassword.length < 6) {
      throw new Error('新密码长度不能少于6位');
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    // 同时递增 token_version 使旧 token 失效
    await db('users').where({ id: userId }).update({
      password_hash: newHash,
      token_version: db.raw('token_version + 1'),
      updated_at: db.fn.now(),
    });

    return { message: '密码修改成功，请重新登录' };
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    const { verifyCode } = await import('../services/email.service');
    const valid = await verifyCode(email, code);
    if (!valid) throw new Error('验证码错误或已过期');

    if (newPassword.length < 6) {
      throw new Error('新密码长度不能少于6位');
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    // 递增 token_version 使所有旧 token 失效
    await db('users').where({ email }).update({
      password_hash: newHash,
      token_version: db.raw('token_version + 1'),
      updated_at: db.fn.now(),
    });

    return { message: '密码重置成功' };
  },
};
