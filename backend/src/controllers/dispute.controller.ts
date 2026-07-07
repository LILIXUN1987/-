import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { logAudit } from '../services/audit.service';
import logger from '../utils/logger';

export const disputeController = {
  // ── 发起争议 ──
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { cooperation_id, respondent_id, title, description, evidence } = req.body;
      if (!respondent_id || !title?.trim() || !description?.trim()) {
        return res.status(400).json({ error: '请填写完整信息' });
      }
      if (respondent_id === req.user!.id) {
        return res.status(400).json({ error: '不能对自己发起争议' });
      }

      // 查是否有过合作记录（如果没有合作记录也允许，但提示）
      if (cooperation_id) {
        const coop = await db('cooperations').where({ id: cooperation_id }).first();
        if (!coop) return res.status(404).json({ error: '合作记录不存在' });
      }

      const id = uuidv4();
      await db('dispute_cases').insert({
        id,
        cooperation_id: cooperation_id || null,
        filed_by: req.user!.id,
        respondent_id,
        title: title.trim(),
        description: description.trim(),
        evidence: evidence ? JSON.stringify(evidence) : null,
        status: 'pending',
      });

      // 通知管理员
      const admins = await db('users').where({ role: 'admin' }).select('id');
      const filer = await db('users').where({ id: req.user!.id }).first() as any;
      const msgContent = `⚖️ 新争议调解申请\n\n申请人：${filer?.company_name || ''} ${filer?.display_name || ''}\n标题：${title}\n\n请前往争议调解中心处理。`;

      for (const admin of admins) {
        await db('messages').insert({
          id: uuidv4(),
          sender_id: req.user!.id,
          receiver_id: admin.id,
          content: msgContent,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      // 争议中标记合作记录
      if (cooperation_id) {
        await db('cooperations').where({ id: cooperation_id }).update({ status: 'disputed' });
      }

      res.status(201).json({ message: '争议已提交，等待管理员介入调解', id });
    } catch (err) { next(err); }
  },

  // ── 争议列表 ──
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const role = (req.user as any)?.role;
      const statusFilter = req.query.status as string;

      let query = db('dispute_cases')
        .leftJoin('users as filer', 'dispute_cases.filed_by', 'filer.id')
        .leftJoin('users as respondent', 'dispute_cases.respondent_id', 'respondent.id')
        .select(
          'dispute_cases.*',
          'filer.display_name as filer_name',
          'filer.company_name as filer_company',
          'respondent.display_name as respondent_name',
          'respondent.company_name as respondent_company',
        );

      if (role === 'admin') {
        // 管理员看全部
      } else {
        // 普通用户看和自己相关的
        query = query.where(function () {
          this.where('dispute_cases.filed_by', userId)
            .orWhere('dispute_cases.respondent_id', userId);
        });
      }

      if (statusFilter) {
        query = query.where('dispute_cases.status', statusFilter);
      }

      const data = await query.orderBy('dispute_cases.created_at', 'desc').limit(50);
      res.json({ data });
    } catch (err) { next(err); }
  },

  // ── 管理员解决争议 ──
  async resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, verdict } = req.body;
      if (!id || !['resolved', 'dismissed'].includes(status)) {
        return res.status(400).json({ error: '参数不完整' });
      }

      const dispute = await db('dispute_cases').where({ id }).first() as any;
      if (!dispute) return res.status(404).json({ error: '争议不存在' });

      await db('dispute_cases').where({ id }).update({
        status,
        verdict: verdict || null,
        resolved_by: req.user!.id,
        resolved_at: db.fn.now(),
      });

      logAudit({ action: 'dispute_' + status, target_type: 'dispute', target_id: id, operator_id: req.user!.id });

      // 如果合作记录被标记争议，根据结果恢复或保持
      if (dispute.cooperation_id) {
        if (status === 'dismissed') {
          await db('cooperations').where({ id: dispute.cooperation_id }).update({ status: 'confirmed' });
        }
      }

      // 通知双方
      const admin = await db('users').where({ id: req.user!.id }).first() as any;
      for (const partyId of [dispute.filed_by, dispute.respondent_id]) {
        await db('messages').insert({
          id: uuidv4(),
          sender_id: req.user!.id,
          receiver_id: partyId,
          content: `⚖️ 争议调解结果\n\n争议：${dispute.title}\n结果：${status === 'resolved' ? '✅ 已裁决' : '❌ 已驳回'}\n${verdict ? `裁决说明：${verdict}` : ''}\n\n调解人：${admin?.display_name || '管理员'}`,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      res.json({ message: '调解已完成' });
    } catch (err) { next(err); }
  },
};
