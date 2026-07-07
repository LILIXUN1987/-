import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { isExpiredForwarder } from '../middleware/trialCheck.middleware';
import logger from '../utils/logger';
import { isRestrictedRole } from '../types';

export const messagesController = {
  // ── 发送消息（支持文件附件） ──
  async send(req: Request, res: Response, next: NextFunction) {
    try {
      if (await isExpiredForwarder(req.user!.id)) {
        return res.status(403).json({ error: '体验期已结束，暂无法发送消息。请联系管理员续期。', code: 'TRIAL_EXPIRED' });
      }

      const { receiver_id, raw_message_id, content } = req.body;
      if (!receiver_id || (!content?.trim() && (!req.files || (req.files as Express.Multer.File[]).length === 0))) {
        return res.status(400).json({ error: '缺少接收人或消息内容' });
      }

      const senderId = req.user!.id;
      if (senderId === receiver_id) {
        return res.status(400).json({ error: '不能给自己发消息' });
      }

      const receiver = await db('users').where({ id: receiver_id }).first();
      if (!receiver) {
        return res.status(400).json({ error: '发布者不存在或已注销' });
      }

      const sender = await db('users').where({ id: senderId }).first();
      const senderName = (sender as any)?.display_name || '';
      const senderCompany = (sender as any)?.company_name || '';
      const senderPhone = (sender as any)?.phone || '';
      const senderUsername = (sender as any)?.username || '';

      // 判断是否首次对话（决定是否发邮件通知）
      const prevCount = await db('messages')
        .where({ sender_id: senderId, receiver_id })
        .count('* as total')
        .first();
      const isFirstMessage = Number((prevCount as any)?.total || 0) === 0;

      // 永远只有发布者回复时才附带手机号，查询者永不附带
      // 判断标准：两人之间最早一条消息是谁发的
      // 查最早消息 → 如果是接收者先发的 → 当前发送者是在回复 → 发布者
      // 如果是当前发送者先发的 → 是查询者 → 不附带手机号
      const firstMsg = await db('messages')
        .where(function () {
          this.where({ sender_id: senderId, receiver_id })
              .orWhere({ sender_id: receiver_id, receiver_id: senderId });
        })
        .orderBy('created_at', 'asc')
        .first();
      const isInquirer = firstMsg && (firstMsg as any).sender_id === senderId;

      // YXD 固定发布者，总是带签名
      const isYXD = senderUsername === 'YXD';
      const pubRole = (sender as any)?.role;
      const isPublisher = !isInquirer && (pubRole === 'forwarder' || pubRole === 'inspector' || pubRole === 'insurer');

      let finalContent = content.trim();
      if (isPublisher || isYXD) {
        if (senderUsername === 'YXD') {
          const yxdSuffix = `\n\n姚先德 / 深圳市新天路国际货运代理有限公司
📞 18676774089（晚上10点前均可联系，紧急随时电话）
✈️ 香港始发 DHL/FEDEX/UPS，折扣高、航班多
📋 报关费250元/票（不退税则免收）`;
          if (!finalContent.includes('18676774089')) {
            finalContent += yxdSuffix;
          }
        } else {
          const contactSuffix = `\n\n—— ${senderName}（${senderPhone}）`;
          if (!finalContent.includes(senderPhone)) {
            finalContent += contactSuffix;
          }
        }
      }

      // 处理文件附件
      const files = req.files as Express.Multer.File[] | undefined;
      let attachments: any[] = [];
      if (files && files.length > 0) {
        attachments = files.map((f) => ({
          path: f.filename,
          original_name: f.originalname,
          mime_type: f.mimetype,
          size: f.size,
        }));
      }

      await db('messages').insert({
        id: uuidv4(),
        sender_id: senderId,
        receiver_id,
        raw_message_id: raw_message_id || null,
        content: finalContent || '',
        attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
        is_read: false,
      });

      res.status(201).json({
        message: '消息已发送',
        sender_name: senderName,
        sender_company: senderCompany,
        attachments: attachments.length,
      });

      // 判断是否发送邮件通知：用户开启了「全部消息邮件通知」或这是首次对话
      const shouldEmail = (receiver as any)?.notify_all_messages_email || isFirstMessage;

      if (shouldEmail && (receiver as any)?.email && (receiver as any)?.email_verified) {
        try {
          const { sendNewMessageNotification } = await import('../services/email.service');
          await sendNewMessageNotification(
            (receiver as any).email,
            (receiver as any).display_name || '',
            senderName,
            senderCompany,
            finalContent,
          );
        } catch (emailErr) {
          logger.error('发送新消息邮件通知失败:', emailErr);
        }
      }

      // ── 浏览器推送通知 ──
      try {
        const { sendPushNotification } = await import('../services/push.service');
        await sendPushNotification(
          receiver_id,
          '📬 新消息',
          `${senderName}${senderCompany ? '(' + senderCompany + ')' : ''} 给您发送了一条消息`,
          '/admin/inbox',
        );
      } catch (pushErr) {
        // 推送失败不阻塞
      }
    } catch (err) {
      next(err);
    }
  },

  // ── 对话列表（按联系人分组，含最后一条消息+未读数） ──
  async conversations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { search, page: pageStr, limit: limitStr } = req.query;
      const page = Math.max(1, parseInt(pageStr as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(limitStr as string) || 20));
      const offset = (page - 1) * limit;

      // 找到所有与当前用户有过对话的对方用户
      const [sentTo, receivedFrom] = await Promise.all([
        db('messages').where('sender_id', userId).distinct('receiver_id as contact_id'),
        db('messages').where('receiver_id', userId).distinct('sender_id as contact_id'),
      ]);
      const contactSet = new Set<string>();
      for (const r of sentTo as any[]) if (r.contact_id) contactSet.add(r.contact_id);
      for (const r of receivedFrom as any[]) if (r.contact_id) contactSet.add(r.contact_id);
      const allContactIds = Array.from(contactSet);

      if (allContactIds.length === 0) {
        return res.json({ data: [], total: 0, page, limit });
      }

      // 搜索筛选：按联系人公司名/姓名搜索
      let filteredIds = allContactIds;
      if (search) {
        const kw = `%${search}%`;
        const matchedUsers = await db('users')
          .whereIn('id', allContactIds)
          .where(function () {
            this.where('display_name', 'like', kw).orWhere('company_name', 'like', kw);
          })
          .select('id');
        filteredIds = (matchedUsers as any[]).map((u: any) => u.id);
      }

      const total = filteredIds.length;
      const pagedIds = filteredIds.slice(offset, offset + limit);

      // 对每个联系人，查最后一条消息 + 未读数
      const data: any[] = [];
      for (const contactId of pagedIds) {
        const contactUser = await db('users').where({ id: contactId }).select('display_name', 'company_name', 'avatar').first() as any;
        if (!contactUser) continue;

        const lastMessage = await db('messages')
          .where(function () {
            this.where({ sender_id: userId, receiver_id: contactId })
              .orWhere({ sender_id: contactId, receiver_id: userId });
          })
          .orderBy('created_at', 'desc')
          .first() as any;

        const unreadCount = await db('messages')
          .where({ sender_id: contactId, receiver_id: userId, is_read: false })
          .count('* as total')
          .first() as any;

        data.push({
          contact_id: contactId,
          display_name: contactUser.display_name,
          company_name: contactUser.company_name,
          avatar: contactUser.avatar,
          last_message: lastMessage?.content?.substring(0, 200) || '',
          last_message_at: lastMessage?.created_at || null,
          last_is_outgoing: lastMessage?.sender_id === userId,
          unread_count: Number(unreadCount?.total || 0),
        });
      }

      // 按最后消息时间降序排列
      data.sort((a, b) => {
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return b.last_message_at.localeCompare(a.last_message_at);
      });

      res.json({ data, total, page, limit });
    } catch (err) {
      next(err);
    }
  },

  // ── 与某人的聊天记录（支持分页） ──
  async conversationMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { contactId } = req.params;
      const { page: pageStr, limit: limitStr, search } = req.query;
      const before = req.query.before as string | undefined;
      const limit = Math.min(100, Math.max(1, parseInt(limitStr as string) || 30));

      let query = db('messages')
        .leftJoin('users as sender', 'messages.sender_id', 'sender.id')
        .leftJoin('users as receiver', 'messages.receiver_id', 'receiver.id')
        .where(function () {
          this.where({ 'messages.sender_id': userId, 'messages.receiver_id': contactId })
            .orWhere({ 'messages.sender_id': contactId, 'messages.receiver_id': userId });
        });

      // 聊天记录关键词搜索
      if (search && typeof search === 'string' && search.trim()) {
        query = query.where('messages.content', 'like', `%${search.trim()}%`);
      }

      query = query.select(
          'messages.id',
          'messages.content',
          'messages.attachments',
          'messages.is_read',
          'messages.read_at',
          'messages.created_at',
          'messages.sender_id',
          'sender.display_name as sender_name',
          'sender.company_name as sender_company',
          'receiver.display_name as receiver_name',
          'receiver.company_name as receiver_company',
        );

      // 向前翻页：加载比 before 更早的消息
      if (before) {
        query = query.whereRaw('messages.created_at < ?', [before]);
      }

      const data = await query
        .orderBy('messages.created_at', 'desc')
        .limit(limit + 1); // 多取1条判断是否还有更多

      const hasMore = data.length > limit;
      if (hasMore) data.pop();

      // 按时间正序返回（前端展示从旧到新）
      data.reverse();

      res.json({ data, hasMore });
    } catch (err) {
      next(err);
    }
  },

  // ── 收件箱（兼容旧版，不加分页则返回最近100条） ──
  async inbox(req: Request, res: Response, next: NextFunction) {
    try {
      const { page: pageStr, limit: limitStr } = req.query;
      const page = Math.max(1, parseInt(pageStr as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitStr as string) || 100));
      const offset = (page - 1) * limit;

      const [data, countResult, unreadResult] = await Promise.all([
        db('messages')
          .leftJoin('users as sender', 'messages.sender_id', 'sender.id')
          .where('messages.receiver_id', req.user!.id)
          .select(
            'messages.id',
            'messages.content',
            'messages.is_read',
            'messages.created_at',
            'messages.sender_id',
            'sender.display_name as sender_name',
            'sender.company_name as sender_company')
          .orderBy('messages.created_at', 'desc')
          .limit(limit)
          .offset(offset),
        db('messages').where('receiver_id', req.user!.id).count('* as total').first(),
        db('messages').where({ receiver_id: req.user!.id, is_read: false }).count('* as total').first(),
      ]);

      const total = Number((countResult as any)?.total || 0);
      const unread = Number((unreadResult as any)?.total || 0);

      res.json({ data, unread, total, page, limit });
    } catch (err) {
      next(err);
    }
  },

  // ── 我发出的消息（支持分页） ──
  async outbox(req: Request, res: Response, next: NextFunction) {
    try {
      const { page: pageStr, limit: limitStr } = req.query;
      const page = Math.max(1, parseInt(pageStr as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitStr as string) || 100));
      const offset = (page - 1) * limit;

      const [data, countResult] = await Promise.all([
        db('messages')
          .leftJoin('users as receiver', 'messages.receiver_id', 'receiver.id')
          .where('messages.sender_id', req.user!.id)
          .select(
            'messages.id',
            'messages.content',
            'messages.is_read',
            'messages.read_at',
            'messages.receiver_id',
            'messages.created_at',
            'receiver.display_name as receiver_name',
            'receiver.company_name as receiver_company')
          .orderBy('messages.created_at', 'desc')
          .limit(limit)
          .offset(offset),
        db('messages').where('sender_id', req.user!.id).count('* as total').first(),
      ]);

      const total = Number((countResult as any)?.total || 0);
      res.json({ data, total, page, limit });
    } catch (err) {
      next(err);
    }
  },

  // ── 标记已读 ──
  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date().toISOString();
      await db('messages').where({ id: req.params.id, receiver_id: req.user!.id }).update({ is_read: true, read_at: now });
      res.json({ message: '已标记已读' });
    } catch (err) {
      next(err);
    }
  },

  // ── 标记某联系人发来的所有未读消息为已读 ──
  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date().toISOString();
      const affected = await db('messages')
        .where({ sender_id: req.params.userId, receiver_id: req.user!.id, is_read: false })
        .update({ is_read: true, read_at: now });
      res.json({ message: '已全部标记已读', count: affected });
    } catch (err) {
      next(err);
    }
  },

  // ── 标记当前用户所有未读消息为已读 ──
  async markAllInboxRead(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date().toISOString();
      const affected = await db('messages')
        .where({ receiver_id: req.user!.id, is_read: false })
        .update({ is_read: true, read_at: now });
      res.json({ message: '已全部标记已读', count: affected });
    } catch (err) {
      next(err);
    }
  },

  // ── 删除与某用户的所有对话 ──
  async deleteConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const otherUserId = req.params.userId;
      const myId = req.user!.id;
      await db('messages')
        .where(function () {
          this.where({ sender_id: myId, receiver_id: otherUserId })
              .orWhere({ sender_id: otherUserId, receiver_id: myId });
        })
        .delete();
      res.json({ message: '对话已删除' });
    } catch (err) {
      next(err);
    }
  },

  // ── 我的询价列表 ──
  async myInquiries(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { page: pageStr, limit: limitStr } = req.query;
      const page = Math.max(1, parseInt(pageStr as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(limitStr as string) || 20));
      const offset = (page - 1) * limit;

      // 总条数
      const countResult = await db('messages')
        .where('sender_id', userId)
        .where('content', 'like', '%有群友%')
        .count('* as total')
        .first();
      const total = Number((countResult as any)?.total || 0);

      const sent = await db('messages')
        .leftJoin('users as receiver', 'messages.receiver_id', 'receiver.id')
        .where('messages.sender_id', userId)
        .where('messages.content', 'like', '%有群友%')
        .select(
          'messages.id',
          'messages.content',
          'messages.created_at',
          'receiver.id as receiver_id',
          'receiver.display_name as receiver_name',
          'receiver.company_name as receiver_company')
        .orderBy('messages.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const result = [];
      for (const msg of sent) {
        const m = msg as any;
        const replyCount = await db('messages')
          .where({ sender_id: m.receiver_id, receiver_id: userId })
          .where('created_at', '>', m.created_at)
          .count('* as total')
          .first();
        result.push({
          ...m,
          inquiry_keyword: m.content?.substring(0, 50) || '',
          has_reply: Number((replyCount as any)?.total || 0) > 0,
          reply_count: Number((replyCount as any)?.total || 0),
        });
      }
      res.json({ data: result, total, page, limit });
    } catch (err) { next(err); }
  },

  // ── 联系管理员 ──
  async contactAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: '请输入消息内容' });

      const admin = await db('users').where({ username: 'admin' }).select('id').first() as any;
      if (!admin) return res.status(500).json({ error: '暂无在线管理员' });

      await db('messages').insert({
        id: uuidv4(),
        sender_id: req.user!.id,
        receiver_id: admin.id,
        content: content.trim(),
        is_read: false,
      });

      res.json({ message: '消息已发送给管理员' });
    } catch (err) { next(err); }
  },

  // ── 律师咨询 ──
  async legalConsult(req: Request, res: Response, next: NextFunction) {
    try {
      const { lawyerId } = req.params;
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: '请输入您要咨询的法律问题' });
      if (!lawyerId) return res.status(400).json({ error: '请选择要咨询的律师' });

      const lawyer = await db('users').where({ id: lawyerId, role: 'lawyer' }).first() as any;
      if (!lawyer) return res.status(404).json({ error: '未找到该律师' });

      const sender = await db('users').where({ id: req.user!.id }).first() as any;
      const userInfo = `${sender?.company_name || ''} ${sender?.display_name || ''}（${sender?.phone || '无手机号'}）`;
      const msgBody = `【律师咨询】咨询人：${userInfo}\n\n${content.trim()}`;

      const previousMessages = await db('messages')
        .where({ sender_id: req.user!.id, receiver_id: lawyerId })
        .where('content', 'like', '【律师咨询】%')
        .count('* as total')
        .first() as any;
      const isFirstConsult = Number(previousMessages?.total || 0) === 0;

      await db('messages').insert({
        id: uuidv4(), sender_id: req.user!.id, receiver_id: lawyerId,
        content: msgBody, is_read: false,
      });

      if (isFirstConsult && lawyer.email && lawyer.email_verified) {
        try {
          const { sendLegalConsultEmail } = await import('../services/email.service');
          await sendLegalConsultEmail(
            lawyer.email, lawyer.display_name,
            sender?.company_name || '', sender?.display_name || '',
            sender?.phone || '', content.trim(),
          );
        } catch (emailErr) {
          logger.error('发送律师咨询外部邮件失败:', emailErr);
        }
      }

      const admin = await db('users').where({ username: 'admin' }).select('id').first() as any;
      if (admin) {
        await db('messages').insert({
          id: uuidv4(), sender_id: req.user!.id, receiver_id: admin.id,
          content: msgBody, is_read: false,
        });
      }

      res.json({ message: `✅ 已向 ${lawyer.display_name} 律师提交咨询，请留意收件箱回复` });
    } catch (err) { next(err); }
  },

  // ── 检测认证 / 运输保险 随机咨询 ──
  async serviceConsult(req: Request, res: Response, next: NextFunction) {
    try {
      const { role } = req.params;
      const { content } = req.body;

      if (!isRestrictedRole(role)) {
        return res.status(400).json({ error: '服务类型不正确', code: 'INVALID_ROLE' });
      }

      if (!content?.trim()) return res.status(400).json({ error: '请输入您的需求描述' });

      const roleLabel = role === 'inspector' ? '检测认证' : '运输保险';

      // 随机选一位该角色的已审核用户
      const providers = await db('users')
        .where({ role, status: 'approved' })
        .select('id', 'display_name', 'company_name', 'email', 'email_verified') as any[];

      if (providers.length === 0) {
        return res.status(404).json({ error: `暂无${roleLabel}服务人员，请稍后再试` });
      }

      const provider = providers[Math.floor(Math.random() * providers.length)];
      const sender = await db('users').where({ id: req.user!.id }).first() as any;
      const userInfo = `${sender?.company_name || ''} ${sender?.display_name || ''}`;
      const msgBody = `【${roleLabel}咨询】咨询人：${userInfo}\n\n${content.trim()}`;

      // 判断是否首次咨询此服务人员
      const previousMessages = await db('messages')
        .where({ sender_id: req.user!.id, receiver_id: provider.id })
        .where('content', 'like', `【${roleLabel}咨询】%`)
        .count('* as total')
        .first() as any;
      const isFirstConsult = Number(previousMessages?.total || 0) === 0;

      await db('messages').insert({
        id: uuidv4(), sender_id: req.user!.id, receiver_id: provider.id,
        content: msgBody, is_read: false,
      });

      // 首次咨询发邮件通知
      if (isFirstConsult && provider.email && provider.email_verified) {
        try {
          const { sendLegalConsultEmail } = await import('../services/email.service');
          await sendLegalConsultEmail(
            provider.email, provider.display_name,
            sender?.company_name || '', sender?.display_name || '',
            '', content.trim(),  // 不附带手机号
          );
        } catch (emailErr) {
          logger.error(`发送${roleLabel}咨询外部邮件失败:`, emailErr);
        }
      }

      // 同时通知管理员
      const admin = await db('users').where({ username: 'admin' }).select('id').first() as any;
      if (admin) {
        await db('messages').insert({
          id: uuidv4(), sender_id: req.user!.id, receiver_id: admin.id,
          content: msgBody, is_read: false,
        });
      }

      res.json({ message: `✅ 已向 ${provider.display_name}（${provider.company_name || roleLabel}）提交${roleLabel}咨询，请留意收件箱回复` });
    } catch (err) { next(err); }
  },

  // ── 获取原始消息的发布者 ──
  async getPosterByRawMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const rawMsg = await db('raw_messages')
        .leftJoin('users', 'raw_messages.uploaded_by', 'users.id')
        .where('raw_messages.id', req.params.id)
        .select('users.id', 'users.display_name', 'users.company_name')
        .first();

      if (!rawMsg || !rawMsg.id) {
        return res.status(404).json({ error: '未找到发布者' });
      }

      res.json(rawMsg);
    } catch (err) {
      next(err);
    }
  },
};
