import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
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

  async lookupByCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const company = req.query.company as string;
      if (!company) return res.status(400).json({ error: '请提供公司名称' });
      const user = await db('users')
        .where('company_name', company)
        .orderBy('created_at', 'asc')
        .first();
      if (!user) return res.json({ id: null, display_name: null, company_name: null });
      res.json({ id: (user as any).id, display_name: (user as any).display_name, company_name: (user as any).company_name });
    } catch (err) { next(err); }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { display_name, phone, gender, company_name, jc_trans_id, wca_id, notify_inquiry_email, notify_inquiry_site, notify_all_messages_email, bio, is_newbie, port_city, port_code, operable_ports, business_scope } = req.body;
      const cardFile = req.file;

      const currentUser = await db('users').where({ id: userId }).first() as any;

      const updateData: Record<string, unknown> = {};
      if (phone !== undefined) updateData.phone = phone;
      if (jc_trans_id !== undefined) updateData.jc_trans_id = jc_trans_id;
      if (wca_id !== undefined) updateData.wca_id = wca_id;
      if (bio !== undefined) updateData.bio = bio;
      if (port_city !== undefined) updateData.port_city = port_city || null;
      if (port_code !== undefined) updateData.port_code = port_code || null;
      if (operable_ports !== undefined) updateData.operable_ports = operable_ports || null;
      if (business_scope !== undefined) updateData.business_scope = business_scope;
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
        // 注册超过30天允许自行修改公司名称
        const createdAt = new Date(currentUser.created_at).getTime();
        const daysSinceReg = (Date.now() - createdAt) / 86400000;
        if (daysSinceReg >= 30) {
          updateData.company_name = company_name;
        } else {
          return res.status(400).json({
            error: `注册未满30天，修改公司名称需要先上传最新的公司名片（注册已 ${Math.floor(daysSinceReg)} 天）`,
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

      // ── 通知管理员审核 ──
      try {
        const adminUser = await db('users').where({ role: 'admin' }).first() as any;
        if (adminUser) {
          const userInfo = await db('users').where({ id: userId }).first() as any;
          await db('messages').insert({
            id: uuidv4(),
            sender_id: userId,
            receiver_id: adminUser.id,
            content: `📋【企业认证审核】\n\n${userInfo?.display_name || ''}（${userInfo?.company_name || '未填公司'}）提交了营业执照，请前往 管理中心→企业认证 进行审核。`,
            is_read: false,
            created_at: new Date().toISOString(),
          });
        }
      } catch {}

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

  // ── 公开公司主页 ──
  async companyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await db('users').where({ id, status: 'approved' }).first() as any;
      if (!user) return res.status(404).json({ error: '用户不存在' });

      // 脱敏手机号
      const phone = user.phone || '';
      const maskedPhone = phone.length >= 7
        ? phone.slice(0, 3) + '****' + phone.slice(-4)
        : phone;

      // 活跃舱位
      const activeCargos = await db('cargo_spaces')
        .where({ status: 'available' })
        .where(function () {
          this.where('uploaded_by', id);
          if (user.phone) this.orWhere('contact_info', 'like', '%' + user.phone + '%');
        })
        .where(function () {
          this.whereNull('valid_to').orWhere('valid_to', '>=', new Date().toISOString().split('T')[0]);
        })
        .select('id', 'origin_port', 'dest_port', 'region', 'airline_code', 'cargo_type',
          'price_per_cbm', 'price_per_kg', 'currency', 'available_cbm', 'available_kg',
          'notes', 'view_count', 'inquiry_count', 'created_at', 'valid_to')
        .orderBy('created_at', 'desc')
        .limit(30);

      // 统计
      const totalViews = activeCargos.reduce((s: number, c: any) => s + (c.view_count || 0), 0);
      const totalInquiries = activeCargos.reduce((s: number, c: any) => s + (c.inquiry_count || 0), 0);
      const totalCargos = await db('cargo_spaces')
        .where(function () {
          this.where('uploaded_by', id);
          if (user.phone) this.orWhere('contact_info', 'like', '%' + user.phone + '%');
        })
        .count('* as total').first() as any;

      // 合作统计
      const cooperationCount = await db('cooperations')
        .where(function () {
          this.where('agent_user_id', id).orWhere('forwarder_user_id', id);
        })
        .where('status', 'confirmed')
        .count('* as total')
        .first() as any;

      // 收到的评价（最近5条）
      const reviews = await db('reviews')
        .leftJoin('users as reviewer', 'reviews.reviewer_id', 'reviewer.id')
        .where('reviews.reviewee_id', id)
        .select('reviews.rating', 'reviews.comment', 'reviews.created_at',
          'reviewer.display_name as reviewer_name', 'reviewer.company_name as reviewer_company')
        .orderBy('reviews.created_at', 'desc')
        .limit(5);

      res.json({
        id: user.id,
        displayName: user.display_name,
        companyName: user.company_name,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio || '',
        phone: maskedPhone,
        email: user.email || '',
        memberSince: user.created_at?.slice(0, 10),
        portCity: user.port_city || '',
        portCode: user.port_code || '',
        stats: {
          totalCargos: Number((totalCargos as any)?.total || 0),
          activeCargos: activeCargos.length,
          totalViews,
          totalInquiries,
          cooperations: Number((cooperationCount as any)?.total || 0),
        },
        reviews: reviews.map((r: any) => ({
          rating: r.rating,
          comment: r.comment,
          reviewerName: r.reviewer_name,
          reviewerCompany: r.reviewer_company,
          createdAt: r.created_at,
        })),
        activeCargos: activeCargos.map((c: any) => ({
          id: c.id,
          originPort: c.origin_port,
          destPort: c.dest_port,
          region: c.region,
          airlineCode: c.airline_code,
          cargoType: c.cargo_type,
          priceCbm: c.price_per_cbm ? Number(c.price_per_cbm) : null,
          priceKg: c.price_per_kg ? Number(c.price_per_kg) : null,
          currency: c.currency,
          availableCbm: c.available_cbm,
          availableKg: c.available_kg,
          validTo: c.valid_to,
          views: c.view_count || 0,
          inquiries: c.inquiry_count || 0,
          notes: c.notes,
          createdAt: c.created_at,
        })),
      });
    } catch (err) { next(err); }
  },
};
