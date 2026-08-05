import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../utils/logger';

export const quoteController = {
  // ── 用户：发起询价 ──
  async createRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { origin, dest, cargo_desc, packaging, weight_kg, volume_cbm, quantity, transport_mode, notes } = req.body;
      if (!dest) return res.status(400).json({ error: '请填写目的港/目的地' });
      if (!origin) return res.status(400).json({ error: '请填写货源地' });
      if (!packaging) return res.status(400).json({ error: '请填写包装方式' });
      if (!notes) return res.status(400).json({ error: '请填写件数与尺寸' });

      const id = uuidv4();
      await db('quote_requests').insert({
        id, user_id: req.user!.id, origin, dest,
        cargo_desc: cargo_desc || null, packaging,
        weight_kg: weight_kg || null,
        volume_cbm: volume_cbm || null, quantity: quantity || 1,
        transport_mode: transport_mode || 'air', notes: notes || null,
        status: 'pending', created_at: new Date().toISOString(),
      });

      // 查询发布过相关目的港的货代，发送站内信通知
      const destUpper = dest.trim().toUpperCase();
      const matchingCargos = await db('cargo_spaces')
        .innerJoin('raw_messages', 'cargo_spaces.uploaded_file_id', 'raw_messages.id')
        .innerJoin('users', 'raw_messages.uploaded_by', 'users.id')
        .where('cargo_spaces.status', 'available')
        .where(function () {
          this.where('cargo_spaces.dest_port', 'like', `%${destUpper}%`)
            .orWhere('cargo_spaces.dest_port', 'like', `%${dest}%`);
        })
        .select('users.id', 'users.display_name', 'users.company_name')
        .distinct()
        .limit(50) as any[];

      const senderUser = await db('users').where({ id: req.user!.id }).first() as any;
      const senderName = senderUser?.display_name || '用户';
      const senderCompany = senderUser?.company_name || '';

      const { sendNewMessageNotification } = await import('../services/email.service');
      for (const fwd of matchingCargos) {
        if (fwd.id === req.user!.id) continue; // 不给自己发
        try {
          const content = `📬 新的询价通知\n\n${senderCompany} ${senderName} 正在寻找至「${dest}」的物流方案。\n货源地：${origin}\n包装：${packaging}\n${weight_kg ? '重量：' + weight_kg + 'KG\n' : ''}${volume_cbm ? '体积：' + volume_cbm + 'CBM\n' : ''}${notes ? '备注：' + notes : ''}\n\n请前往「物流询价 → 待报价」查看详情并报价。`;
          await db('messages').insert({
            id: uuidv4(), sender_id: req.user!.id, receiver_id: fwd.id,
            content, is_read: false, created_at: new Date().toISOString(),
          });
          // 邮件通知
          const fwdUser = await db('users').where({ id: fwd.id }).select('email', 'email_verified', 'display_name').first() as any;
          if (fwdUser?.email && fwdUser?.email_verified) {
            try {
              await sendNewMessageNotification(fwdUser.email, fwdUser.display_name || '', senderName, senderCompany, content);
            } catch {}
          }
        } catch {}
      }

      res.status(201).json({ message: '询价已发布', id, matched_forwarders: matchingCargos.length });
    } catch (err) { next(err); }
  },

  // ── 我的询价列表 ──
  async myRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('quote_requests')
        .where({ user_id: req.user!.id })
        .orderBy('created_at', 'desc').limit(20);

      // 查每个询价收到的报价数
      const result = [];
      for (const r of data) {
        const count = await db('quotes').where({ request_id: r.id }).count('* as total').first();
        result.push({ ...r, quote_count: Number((count as any)?.total || 0) });
      }
      res.json({ data: result });
    } catch (err) { next(err); }
  },

  // ── 货代：查看待报价的询价 ──
  async pendingRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await db('users').where({ id: userId }).first() as any;
      const role = user?.role;
      const company = user?.company_name || '';

      let query = db('quote_requests')
        .leftJoin('users', 'quote_requests.user_id', 'users.id')
        .select('quote_requests.*', 'users.display_name as requester_name', 'users.company_name as requester_company')
        .where('quote_requests.status', 'pending')
        .where('quote_requests.user_id', '!=', userId);

      // 货代只显示与自己发布过航线相关目的港的询价
      if (role === 'forwarder') {
        const myCodes = await db('cargo_spaces')
          .where('status', 'available')
          .whereNotNull('dest_port')
          .select('dest_port')
          .distinct() as any[];
        const codes = myCodes
          .flatMap((c: any) => (c.dest_port || '').split(',').map((s: string) => s.trim().toUpperCase()))
          .filter((s: string) => s.length > 0);
        if (codes.length > 0) {
          query = query.where(function () {
            for (const code of codes) {
              this.orWhere('quote_requests.dest', 'like', `%${code}%`);
            }
          });
        } else {
          // 没有发布任何航线 → 看不到任何询价
          query = query.whereRaw('1=0');
        }
      }

      const data = await query.orderBy('quote_requests.created_at', 'desc').limit(50);
      res.json({ data });
    } catch (err) { next(err); }
  },

  // ── 货代：提交报价 ──
  async submitQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const { request_id, price_amount, currency, transit_days, valid_until, notes } = req.body;
      if (!request_id || !price_amount) return res.status(400).json({ error: '请填写报价金额' });

      const existing = await db('quotes').where({ request_id, forwarder_id: req.user!.id }).first();
      if (existing) return res.status(400).json({ error: '您已对该询价报过价，请勿重复报价' });

      await db('quotes').insert({
        id: uuidv4(), request_id, forwarder_id: req.user!.id,
        price_amount, currency: currency || 'CNY',
        transit_days: transit_days || null, valid_until: valid_until || null,
        notes: notes || null, status: 'pending',
      });

      // 通知询价发起人
      const request = await db('quote_requests').where({ id: request_id }).first() as any;
      const forwarder = await db('users').where({ id: req.user!.id }).first() as any;
      if (request && request.user_id !== req.user!.id) {
        const senderName = forwarder?.display_name || '未知';
        const senderCompany = forwarder?.company_name || '';
        await db('messages').insert({
          id: uuidv4(), sender_id: req.user!.id, receiver_id: request.user_id,
          content: `📬 您有一个新的报价\n\n${senderCompany} ${senderName} 已对您的询价（${request.dest || '未知目的地'}）提交了报价，请前往「我的询价」查看详情。`,
          is_read: false, created_at: new Date().toISOString(),
        });
      }

      res.json({ message: '报价已提交' });
    } catch (err) { next(err); }
  },

  // ── 用户：查看某询价的报价列表 ──
  async getQuotes(req: Request, res: Response, next: NextFunction) {
    try {
      const { requestId } = req.params;
      const request = await db('quote_requests').where({ id: requestId }).first();
      if (!request) return res.status(404).json({ error: '询价不存在' });

      const data = await db('quotes')
        .leftJoin('users', 'quotes.forwarder_id', 'users.id')
        .select('quotes.*', 'users.display_name as forwarder_name', 'users.company_name as forwarder_company')
        .where('quotes.request_id', requestId)
        .orderBy('quotes.created_at', 'desc');

      res.json({ data, request });
    } catch (err) { next(err); }
  },

  // ── 用户：接受报价 ──
  async acceptQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const { quoteId } = req.params;
      const quote = await db('quotes').where({ id: quoteId }).first() as any;
      if (!quote) return res.status(404).json({ error: '报价不存在' });

      const request = await db('quote_requests').where({ id: quote.request_id }).first() as any;
      if (!request || request.user_id !== req.user!.id) return res.status(403).json({ error: '无权操作' });

      await db('quotes').where({ id: quoteId }).update({ status: 'accepted' });
      await db('quotes').where({ request_id: quote.request_id, id: { '!=': quoteId } }).update({ status: 'rejected' });
      await db('quote_requests').where({ id: quote.request_id }).update({ status: 'completed' });

      // 通知货代
      const user = await db('users').where({ id: req.user!.id }).first() as any;
      await db('messages').insert({
        id: uuidv4(), sender_id: req.user!.id, receiver_id: quote.forwarder_id,
        content: `✅ 您的报价已被接受！\n\n${user?.company_name || ''} ${user?.display_name || ''} 已接受您对（${request.dest || '未知'}）的报价，请通过站内信与对方联系沟通后续事宜。`,
        is_read: false, created_at: new Date().toISOString(),
      });

      res.json({ message: '已接受该报价' });
    } catch (err) { next(err); }
  },
};
