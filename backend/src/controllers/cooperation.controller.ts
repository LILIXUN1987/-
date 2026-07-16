import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../utils/logger';
import { logAudit } from '../services/audit.service';

export const cooperationController = {
  // ── 登记合作（双向：货代→海外代理 / 海外代理→货代） ──
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { agent_user_id, forwarder_user_id: fwId, agent_company, service_type, description } = req.body;
      const userId = req.user!.id;
      const user = await db('users').where({ id: userId }).first() as any;
      const isAgent = user?.role === 'overseas_agent';

      const targetAgentUserId = isAgent ? userId : agent_user_id;
      const targetFwUserId = isAgent ? fwId : userId;

      if (!targetAgentUserId && !targetFwUserId) {
        return res.status(400).json({ error: isAgent ? '请选择中国货代' : '请选择海外代理' });
      }

      const otherUserId = isAgent ? fwId : agent_user_id;
      const otherUser = await db('users').where({ id: otherUserId }).first() as any;
      if (!otherUser) return res.status(404).json({ error: '对方用户不存在' });

      const finalAgentUserId = targetAgentUserId;
      const finalFwUserId = targetFwUserId;

      const existing = await db('cooperations')
        .where({ agent_user_id: finalAgentUserId, forwarder_user_id: finalFwUserId })
        .whereNot('status', 'disputed')
        .first();
      if (existing) {
        return res.json({ message: '您与该用户已有合作记录', cooperation: existing });
      }

      const id = uuidv4();
      await db('cooperations').insert({
        id,
        agent_user_id: finalAgentUserId,
        forwarder_user_id: finalFwUserId,
        agent_company: agent_company || (isAgent ? user?.company_name : otherUser?.company_name) || null,
        forwarder_company: isAgent ? otherUser?.company_name : user?.company_name || null,
        service_type: service_type || null,
        description: description || null,
        status: 'pending',
      });

      // 给对方发站内信通知
      await db('messages').insert({
        id: uuidv4(),
        sender_id: userId,
        receiver_id: otherUserId,
        content: `🤝 合作确认通知\n\n${user?.company_name || ''} ${user?.display_name || ''} 已与贵司登记合作。请登录社区「我的合作商」页面确认此项合作。\n\n说明：${description || '无'}`,
        is_read: false,
        created_at: new Date().toISOString(),
      });

      res.status(201).json({ message: '合作已登记，等待对方确认', id });
    } catch (err) { next(err); }
  },

  // ── 确认合作 ──
  async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const coop = await db('cooperations').where({ id }).first() as any;
      if (!coop) return res.status(404).json({ error: '合作记录不存在' });
      if (coop.agent_user_id !== req.user!.id) return res.status(403).json({ error: '仅代理方可确认' });

      await db('cooperations').where({ id }).update({ status: 'confirmed', confirmed_at: db.fn.now() });

      // 更新 DDP 代理的 completed_orders
      const ddpAgent = await db('ddp_agents').where({ created_by: coop.agent_user_id }).first() as any;
      if (ddpAgent) {
        await db('ddp_agents').where({ id: ddpAgent.id }).increment('completed_orders', 1);
      }

      res.json({ message: '✅ 合作已确认' });
    } catch (err) { next(err); }
  },

  // ── 我的合作商（货代视角/代理视角） ──
  async myPartners(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const role = (req.user as any)?.role;

      let rows: any[];
      if (role === 'overseas_agent') {
        // 代理视角：看哪些货代和我合作
        rows = await db('cooperations')
          .where({ agent_user_id: userId })
          .leftJoin('users', 'cooperations.forwarder_user_id', 'users.id')
          .select(
            'cooperations.*',
            'users.display_name as partner_name',
            'users.company_name as partner_company',
            'users.avatar as partner_avatar',
          )
          .orderBy('cooperations.created_at', 'desc')
          .limit(100);
      } else {
        // 货代视角：看哪些代理我和合作
        rows = await db('cooperations')
          .where({ forwarder_user_id: userId })
          .leftJoin('users', 'cooperations.agent_user_id', 'users.id')
          .select(
            'cooperations.*',
            'users.display_name as partner_name',
            'users.company_name as partner_company',
            'users.avatar as partner_avatar',
          )
          .orderBy('cooperations.created_at', 'desc')
          .limit(100);
      }

      // 获取每个合作方的评价统计
      const result = [];
      for (const row of rows) {
        const partnerId = role === 'overseas_agent' ? row.forwarder_user_id : row.agent_user_id;
        const reviewStats = await db('reviews')
          .where({ reviewee_id: partnerId })
          .select('rating')
          .orderBy('created_at', 'desc');

        const total = reviewStats.length;
        const sum = reviewStats.reduce((acc: number, r: any) => acc + r.rating, 0);
        const avgRating = total > 0 ? (sum / total).toFixed(1) : null;

        // 合作计数
        const coopCount = await db('cooperations')
          .where({ agent_user_id: partnerId, status: 'confirmed' })
          .orWhere({ forwarder_user_id: partnerId, status: 'confirmed' })
          .count('* as total').first() as any;

        result.push({
          ...row,
          avg_rating: avgRating ? Number(avgRating) : null,
          review_count: total,
          total_coops: Number(coopCount?.total || 0),
        });
      }

      res.json({ data: result });
    } catch (err) { next(err); }
  },

  // ── 代理信用分 ──
  async creditScore(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;
      if (!userId) return res.status(400).json({ error: '缺少用户ID' });

      // 1. 评价统计
      const reviews = await db('reviews').where({ reviewee_id: userId }).select('rating');
      const reviewCount = reviews.length;
      const avgRating = reviewCount > 0
        ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviewCount
        : 0;

      // 2. 已确认的合作数
      const coopConfirmed = await db('cooperations')
        .where(function () { this.where({ agent_user_id: userId }).orWhere({ forwarder_user_id: userId }); })
        .where({ status: 'confirmed' })
        .count('* as total').first() as any;
      const totalCoops = Number(coopConfirmed?.total || 0);

      // 3. 争议情况
      const disputesAgainst = await db('dispute_cases')
        .where({ respondent_id: userId })
        .count('* as total').first() as any;
      const totalDisputes = Number((disputesAgainst as any)?.total || 0);

      // 4. 是否上传了公司认证
      const user = await db('users').where({ id: userId }).first() as any;
      const hasCard = !!user?.card_image;

      // 5. 账号注册天数
      const daysSinceReg = user?.created_at
        ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
        : 0;

      // ── 计算信用分 (0-100) ──
      let score = 50; // 基础分

      // 评价：满分30
      if (reviewCount > 0) {
        score += (avgRating / 5) * 30;
      } else {
        score += 10; // 暂无评价给基础分
      }

      // 合作数：满分25
      score += Math.min(totalCoops, 50) * 0.5;

      // 争议：每有一条扣15分
      score -= totalDisputes * 15;

      // 名片认证：+10
      if (hasCard) score += 10;

      // 注册时长：满1年+5，满2年+10
      if (daysSinceReg >= 365) score += 5;
      if (daysSinceReg >= 730) score += 5;

      score = Math.max(0, Math.min(100, Math.round(score)));

      // 等级
      let level: string;
      if (score >= 90) level = '⭐⭐⭐⭐⭐ 行业金口碑';
      else if (score >= 75) level = '⭐⭐⭐⭐ 非常可靠';
      else if (score >= 60) level = '⭐⭐⭐ 信誉良好';
      else if (score >= 40) level = '⭐⭐ 基础可信';
      else level = '⭐ 新入驻';

      res.json({
        score,
        level,
        details: { reviewCount, avgRating: Math.round(avgRating * 10) / 10, totalCoops, totalDisputes, hasCard, daysSinceReg },
      });
    } catch (err) { next(err); }
  },
};
