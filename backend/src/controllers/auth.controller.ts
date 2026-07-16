import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { LoginRequest } from '../types';
import db from '../config/database';
import { sendVerificationCode, verifyCode } from '../services/email.service';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body as LoginRequest;
      const result = await authService.login(username, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user!.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async sendCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, role } = req.body;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: '请输入有效的邮箱地址', code: 'INVALID_EMAIL' });
      }
      await sendVerificationCode(email, role);
      res.json({ message: '验证码已发送' });
    } catch (err) {
      next(err);
    }
  },

  async checkCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: '参数不完整' });
      }
      const valid = await verifyCode(email, code);
      if (valid) {
        res.json({ message: '验证成功' });
      } else {
        res.status(400).json({ error: '验证码错误或已过期', code: 'INVALID_CODE' });
      }
    } catch (err) {
      next(err);
    }
  },

  // ── 注册时查询同公司同事 ──
  async companyMates(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string || '').trim();
      if (q.length < 2) return res.json({ data: [] });

      const users = await db('users')
        .where('company_name', 'like', `%${q}%`)
        .whereNot('status', 'banned')
        .select('display_name', 'company_name')
        .limit(10);

      res.json({ data: users });
    } catch (err) { next(err); }
  },

  async lookupByPhone(req: Request, res: Response, next: NextFunction) {
    try {
      const phone = req.query.phone as string;
      const role = req.query.role as string;
      if (role === 'overseas_agent') {
        if (!phone) {
          return res.status(400).json({ error: 'Please provide a phone number' });
        }
      } else {
        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
          return res.status(400).json({ error: '无效的手机号' });
        }
      }
      const user = await db('users').where({ phone }).first();
      if (!user) {
        // 返回相同结构但不暴露用户是否存在
        return res.json({ id: null, display_name: null, company_name: null });
      }
      // 只返回必要信息，不暴露邮箱
      res.json({ id: (user as any).id, display_name: (user as any).display_name, company_name: (user as any).company_name });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { display_name, phone, gender, company_name, jc_trans_id, wca_id, notify_inquiry_email, notify_inquiry_site, notify_all_messages_email, bio, is_newbie } = req.body;
      const cardFile = req.file;

      const currentUser = await db('users').where({ id: userId }).first() as any;

      const updateData: Record<string, unknown> = {};
      if (phone !== undefined) updateData.phone = phone;
      if (jc_trans_id !== undefined) updateData.jc_trans_id = jc_trans_id;
      if (wca_id !== undefined) updateData.wca_id = wca_id;
      if (bio !== undefined) updateData.bio = bio;
      // 通知偏好（JSON body 或 multipart 传字符串）
      if (notify_inquiry_email !== undefined) updateData.notify_inquiry_email = notify_inquiry_email === true || notify_inquiry_email === 'true' ? 1 : 0;
      if (notify_inquiry_site !== undefined) updateData.notify_inquiry_site = notify_inquiry_site === true || notify_inquiry_site === 'true' ? 1 : 0;
      if (notify_all_messages_email !== undefined) updateData.notify_all_messages_email = notify_all_messages_email === true || notify_all_messages_email === 'true' ? 1 : 0;
      if (is_newbie !== undefined) updateData.is_newbie = is_newbie === true || is_newbie === 'true' ? 1 : 0;

      if (cardFile) {
        updateData.card_image = cardFile.path;
        if (company_name !== undefined && company_name !== currentUser?.company_name) {
          updateData.company_name = company_name;
        }
      } else if (company_name !== undefined && company_name !== currentUser?.company_name) {
        // 注册超过15天允许自行修改公司名称
        const createdAt = new Date(currentUser.created_at).getTime();
        const daysSinceReg = (Date.now() - createdAt) / 86400000;
        if (daysSinceReg >= 15) {
          updateData.company_name = company_name;
        } else {
          return res.status(400).json({
            error: `注册未满15天，修改公司名称需要先上传最新的公司名片（注册已 ${Math.floor(daysSinceReg)} 天）`,
            code: 'CARD_REQUIRED',
          });
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: '没有需要更新的字段' });
      }

      updateData.updated_at = db.fn.now();
      await db('users').where({ id: userId }).update(updateData);

      const user = await authService.getMe(userId);
      res.json({ message: '更新成功', user });
    } catch (err) {
      next(err);
    }
  },

  // ── 上传营业执照（申请企业认证） ──
  async uploadLicense(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await db('users').where({ id: userId }).first() as any;
      if (!user || user.role !== 'forwarder') {
        return res.status(400).json({ error: '仅货运代理可申请企业认证' });
      }
      const file = req.file;
      if (!file) return res.status(400).json({ error: '请上传营业执照图片' });
      await db('users').where({ id: userId }).update({
        company_license: file.path,
        is_verified_company: 0, // 重新提交后重置审核状态
        updated_at: db.fn.now(),
      });
      const updatedUser = await authService.getMe(userId);
      res.json({ message: '营业执照已上传，等待管理员审核', user: updatedUser });
    } catch (err) { next(err); }
  },

  // ── 上传头像（仅接受真实人脸照片） ──
  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const file = req.file;
      if (!file) return res.status(400).json({ error: '请上传头像图片' });

      await db('users').where({ id: userId }).update({
        avatar: file.path,
        updated_at: db.fn.now(),
      });
      const updatedUser = await authService.getMe(userId);
      res.json({ message: '✅ 头像已更新', user: updatedUser });
    } catch (err) { next(err); }
  },

  // ── 修改密码（需原密码） ──
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { old_password, new_password } = req.body;
      if (!old_password || !new_password) {
        return res.status(400).json({ error: '请填写原密码和新密码' });
      }
      const result = await authService.changePassword(req.user!.id, old_password, new_password);
      res.json(result);
    } catch (err: any) {
      if (err.message === '原密码错误') return res.status(400).json({ error: err.message });
      if (err.message?.includes('长度')) return res.status(400).json({ error: err.message });
      next(err);
    }
  },

  // ── 忘记密码（发送重置验证码到邮箱） ──
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: '请输入有效的邮箱地址' });
      }
      // 先查邮箱是否注册过，没注册不发验证码（统一返回成功，不暴露信息）
      const user = await db('users').where({ email }).first();
      if (user && (user as any).email_verified) {
        await sendVerificationCode(email);
      }
      res.json({ message: '如果该邮箱已注册，验证码已发送' });
    } catch (err) {
      next(err);
    }
  },

  // ── 重置密码（验证码 + 新密码） ──
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, code, new_password } = req.body;
      if (!email || !code || !new_password) {
        return res.status(400).json({ error: '参数不完整' });
      }
      const result = await authService.resetPassword(email, code, new_password);
      res.json(result);
    } catch (err: any) {
      if (err.message?.includes('验证码')) return res.status(400).json({ error: err.message });
      if (err.message?.includes('长度')) return res.status(400).json({ error: err.message });
      next(err);
    }
  },

  // ── 注销账号 ──
  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { password } = req.body;
      if (!password) return res.status(400).json({ error: '请填写密码以确认注销' });

      const user = await db('users').where({ id: req.user!.id }).first() as any;
      if (!user) return res.status(404).json({ error: '用户不存在' });

      const bcrypt = require('bcryptjs');
      if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(403).json({ error: '密码错误，注销失败' });
      }

      // 软删除：清空用户数据并标记删除
      const deletedSuffix = `_deleted_${Date.now()}`;
      await db('users').where({ id: req.user!.id }).update({
        username: `deleted${deletedSuffix}`,
        password_hash: '',
        display_name: '已注销用户',
        company_name: null,
        phone: null,
        email: null,
        card_image: null,
        avatar: null,
        bio: null,
        status: 'deleted',
        token_version: (user.token_version || 0) + 1,
      });

      // 清理已发送的消息内容（保留消息记录但抹去内容）
      await db('messages')
        .where({ sender_id: req.user!.id })
        .update({ content: '[该用户已注销]', attachments: null });
      await db('messages')
        .where({ receiver_id: req.user!.id })
        .update({ content: '[该用户已注销]', attachments: null });

      res.json({ message: '账号已注销' });
    } catch (err) {
      next(err);
    }
  },
};
