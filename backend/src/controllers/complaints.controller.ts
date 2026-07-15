import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../utils/logger';

/** 触发风控的阈值：同一公司被 ≥5 家不同公司投诉 */
const RISK_THRESHOLD = 5;

export const complaintsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page: pageStr, limit: limitStr } = req.query;
      const page = Math.max(1, parseInt(pageStr as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitStr as string) || 30));
      const offset = (page - 1) * limit;

      const [countResult, data] = await Promise.all([
        db('complaints').count('* as total').first(),
        db('complaints')
          .leftJoin('users', 'complaints.created_by', 'users.id')
          .select(
            'complaints.*',
            'users.display_name as uploader_name',
            'users.company_name as uploader_company'
          )
          .orderBy('complaints.created_at', 'desc')
          .limit(limit)
          .offset(offset),
      ]);

      const total = Number((countResult as any)?.total || 0);
      res.json({ data, total, page, limit });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { complaint_company, target_company, complaint_person, target_person, reason } = req.body;

      if (!complaint_company || !target_company || !complaint_person || !target_person || !reason) {
        return res.status(400).json({ error: '请填写所有必填项', code: 'MISSING_FIELDS' });
      }

      await db('complaints').insert({
        id: uuidv4(),
        complaint_company,
        target_company,
        complaint_person,
        target_person,
        reason,
        created_by: req.user!.id,
      });

      // ── 自动风控检测：同一公司被≥5家不同用户投诉 → 通知管理员审批 ──
      const complainerCount = await db('complaints')
        .where({ target_company })
        .countDistinct('complaint_company as total')
        .first();

      if (Number((complainerCount as any)?.total || 0) >= RISK_THRESHOLD) {
        // 检查是否已有待审批或已审批的预警（去重）
        const existingAlert = await db('risk_alerts')
          .where({ target_company })
          .whereIn('status', ['pending', 'approved'])
          .first();

        if (!existingAlert) {
          const alertId = uuidv4();
          await db('risk_alerts').insert({
            id: alertId,
            target_company,
            complaint_count: Number((complainerCount as any)?.total || 0),
            status: 'pending',
            created_by: req.user!.id,
          });

          const admins = await db('users').where({ role: 'admin' }).select('id');
          for (const admin of admins) {
            await db('messages').insert({
              id: uuidv4(),
              sender_id: req.user!.id,
              receiver_id: admin.id,
              content: `⚠️ 风控预警：${target_company} 已被 ${(complainerCount as any)?.total} 家不同公司投诉，请到「风控中心」审核是否群发提醒通知。`,
              is_read: false,
            });
          }
          logger.info(`⚠️ 风控触发：${target_company} 已被 ${(complainerCount as any)?.total} 家公司吐槽，已通知管理员审批`);
        }
      }

      res.status(201).json({ message: '吐槽发布成功' });
    } catch (err) {
      next(err);
    }
  },

  async companyStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = req.query;
      const keyword = (q as string || '').trim();

      // ── 按公司聚合：被投诉次数最多的公司 ──
      const topComplained = await db('complaints')
        .select('target_company')
        .select(db.raw('COUNT(*) as total'))
        .select(db.raw('COUNT(DISTINCT complaint_company) as distinct_complainers'))
        .groupBy('target_company')
        .orderByRaw('COUNT(*) DESC')
        .limit(20) as any[];

      // ── 如果有搜索关键字，查该公司详情 ──
      let companyDetail = null;
      if (keyword) {
        const complaints = await db('complaints')
          .leftJoin('users', 'complaints.created_by', 'users.id')
          .select(
            'complaints.*',
            'users.display_name as uploader_name',
            'users.company_name as uploader_company'
          )
          .where('complaints.target_company', 'like', `%${keyword.replace(/[%_]/g, '\\$&')}%`)
          .orderBy('complaints.created_at', 'desc')
          .limit(50) as any[];

        if (complaints.length > 0) {
          const reasonBreakdown = complaints.reduce((acc: Record<string, number>, c: any) => {
            acc[c.reason] = (acc[c.reason] || 0) + 1;
            return acc;
          }, {});
          const topReasons = Object.entries(reasonBreakdown)
            .sort(([, a]: any, [, b]: any) => b - a)
            .slice(0, 5)
            .map(([reason, count]) => ({ reason, count }));

          companyDetail = {
            target_company: complaints[0].target_company,
            total: complaints.length,
            distinct_complainers: new Set(complaints.map((c: any) => c.complaint_company)).size,
            topReasons,
            complaints: complaints.slice(0, 20),
          };
        }
      }

      res.json({
        topComplained: topComplained.map((c: any) => ({
          company: c.target_company,
          total: Number(c.total || 0),
          distinct_complainers: Number(c.distinct_complainers || 0),
        })),
        companyDetail,
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const complaint = await db('complaints').where({ id: req.params.id }).first() as any;
      if (!complaint) return res.status(404).json({ error: '吐槽不存在' });
      const user = await db('users').where({ id: req.user!.id }).first() as any;
      if (!user || (user.role !== 'admin' && complaint.created_by !== req.user!.id)) {
        return res.status(403).json({ error: '无权限删除此吐槽' });
      }
      await db('complaints').where({ id: req.params.id }).delete();
      res.json({ message: '已删除' });
    } catch (err) {
      next(err);
    }
  },
};
