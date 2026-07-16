import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { authRequired } from '../middleware/auth.middleware';

const router = Router();

// 所有海外代理相关接口均需登录
router.use(authRequired);

// ════════════════════════════════════════════════
// GET /api/overseas/my-profile
// 获取当前海外代理的 DDP 代理档案 + 信用分
// ════════════════════════════════════════════════
router.get('/my-profile', async (req, res) => {
  try {
    const userId = req.user!.id;
    const agent = await db('ddp_agents').where({ created_by: userId }).first();
    const creditScore = await calculateCreditScore(userId);
    res.json({ profile: agent || null, credit_score: creditScore });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ════════════════════════════════════════════════
// PUT /api/overseas/my-profile
// 创建或更新海外代理 DDP 档案（自动通过审核）
// ════════════════════════════════════════════════
router.put('/my-profile', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { company_name, contact_person, email, phone, country, city, service_ports, service_types, description, reference_price } = req.body;

    if (!company_name?.trim()) return res.status(400).json({ error: '请填写公司名称' });
    if (!country?.trim()) return res.status(400).json({ error: '请填写所在国家' });

    const payload = {
      company_name: company_name.trim(),
      contact_person: contact_person?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      country: country.trim(),
      city: city?.trim() || null,
      service_ports: service_ports?.trim() || null,
      service_types: service_types?.trim() || 'DDP',
      description: description?.trim() || null,
      reference_price: reference_price?.trim() || null,
      status: 'approved',
    };

    const existing = await db('ddp_agents').where({ created_by: userId }).first();
    if (existing) {
      await db('ddp_agents').where({ created_by: userId }).update(payload);
      res.json({ message: '✅ 代理信息已更新' });
    } else {
      await db('ddp_agents').insert({ id: uuidv4(), ...payload, created_by: userId });
      res.status(201).json({ message: '✅ 代理信息已创建' });
    }
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ════════════════════════════════════════════════
// GET /api/overseas/forwarders
// 搜索国内货代（带信用分+合作次数）
// ════════════════════════════════════════════════
router.get('/forwarders', async (req, res) => {
  try {
    const userId = req.user!.id;
    const q = (req.query.q as string || '').trim();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 100);
    const offset = (page - 1) * limit;

    let query = db('users').where({ role: 'forwarder', status: 'approved' });
    if (q) {
      query = query.where(function () {
        this.where('company_name', 'like', `%${q}%`)
          .orWhere('display_name', 'like', `%${q}%`);
      });
    }

    const totalQuery = query.clone();
    const total = Number(((await totalQuery.count('* as total').first()) as any)?.total || 0);

    const forwarders = await query
      .select('id', 'display_name', 'company_name', 'role', 'card_image', 'created_at')
      .orderBy('company_name', 'asc')
      .limit(limit)
      .offset(offset);

    const fwIds = forwarders.map((f: any) => f.id);

    // 批量查询合作次数、评价、争议
    const [coopRows, reviewRows, disputeRows] = await Promise.all([
      fwIds.length > 0 ? db('cooperations')
        .where({ agent_user_id: userId })
        .whereIn('forwarder_user_id', fwIds)
        .select('forwarder_user_id')
        .select(db.raw('COUNT(*) as cnt'))
        .groupBy('forwarder_user_id') as any : [],
      fwIds.length > 0 ? db('reviews')
        .whereIn('reviewee_id', fwIds)
        .select('reviewee_id', 'rating') as any : [],
      fwIds.length > 0 ? db('dispute_cases')
        .whereIn('respondent_id', fwIds)
        .select('respondent_id')
        .select(db.raw('COUNT(*) as cnt'))
        .groupBy('respondent_id') as any : [],
    ]);

    const coopMap: Record<string, number> = {};
    for (const r of coopRows) coopMap[r.forwarder_user_id] = Number(r.cnt);

    const reviewMap: Record<string, number[]> = {};
    for (const r of reviewRows) {
      if (!reviewMap[r.reviewee_id]) reviewMap[r.reviewee_id] = [];
      reviewMap[r.reviewee_id].push(r.rating);
    }

    const disputeMap: Record<string, number> = {};
    for (const r of disputeRows) disputeMap[r.respondent_id] = Number(r.cnt);

    const result = forwarders.map((f: any) => {
      const ratings = reviewMap[f.id] || [];
      const reviewCount = ratings.length;
      const avgRating = reviewCount > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / reviewCount : 0;
      const totalCoops = coopMap[f.id] || 0;
      const totalDisputes = disputeMap[f.id] || 0;

      let score = 50;
      if (reviewCount > 0) score += (avgRating / 5) * 30;
      else score += 10;
      score += Math.min(totalCoops, 50) * 0.5;
      score -= totalDisputes * 15;
      if (f.card_image) score += 10;
      if (f.created_at && Math.floor((Date.now() - new Date(f.created_at).getTime()) / 86400000) >= 365) score += 5;
      score = Math.max(0, Math.min(100, Math.round(score)));

      return { id: f.id, display_name: f.display_name, company_name: f.company_name, role: f.role, credit_score: score, cooperation_count: coopMap[f.id] || 0 };
    });

    res.json({ data: result, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ════════════════════════════════════════════════
// GET /api/overseas/my-stats
// 海外代理个人统计
// ════════════════════════════════════════════════
router.get('/my-stats', async (req, res) => {
  try {
    const userId = req.user!.id;

    const [totalInquiries, pendingReplies, totalCooperations, confirmedCooperations]
      = await Promise.all([
        db('messages')
          .where({ receiver_id: userId })
          .where(function () {
            this.where('content', 'like', '%DDP%')
              .orWhere('content', 'like', '%询价%');
          })
          .count('* as total').first() as Promise<any>,

        db('messages')
          .where({ receiver_id: userId, is_read: false })
          .count('* as total').first() as Promise<any>,

        db('cooperations')
          .where({ agent_user_id: userId })
          .count('* as total').first() as Promise<any>,

        db('cooperations')
          .where({ agent_user_id: userId, status: 'confirmed' })
          .count('* as total').first() as Promise<any>,
      ]);

    // 平均回复时间（秒）：找双向消息对，算时间差平均值
    let avgResponseSeconds: number | null = null;
    try {
      const avgRows: any[] = await db.raw(`
        SELECT AVG(
          (SELECT MIN(strftime('%s', r.created_at)) - strftime('%s', m.created_at)
           FROM messages r
           WHERE r.sender_id = ?
             AND r.receiver_id = m.sender_id
             AND r.created_at > m.created_at
          )
        ) as avg_seconds
        FROM messages m
        WHERE m.receiver_id = ?
          AND EXISTS (
            SELECT 1 FROM messages r
            WHERE r.sender_id = ?
              AND r.receiver_id = m.sender_id
              AND r.created_at > m.created_at
          )
      `, [userId, userId, userId]);
      const raw = avgRows?.[0]?.avg_seconds;
      if (raw != null) avgResponseSeconds = Math.round(Number(raw));
    } catch {
      // avg计算失败则返回 null
    }

    res.json({
      total_inquiries: Number((totalInquiries as any)?.total || 0),
      pending_replies: Number((pendingReplies as any)?.total || 0),
      total_cooperations: Number((totalCooperations as any)?.total || 0),
      confirmed_cooperations: Number((confirmedCooperations as any)?.total || 0),
      avg_response_time: avgResponseSeconds,
    });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ════════════════════════════════════════════════
// GET /api/overseas/inquiries
// 发给当前海外代理的 DDP 询价列表
// ════════════════════════════════════════════════
router.get('/inquiries', async (req, res) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 100);
    const offset = (page - 1) * limit;

    const totalQuery = db('messages')
      .where({ receiver_id: userId })
      .where('content', 'like', '%DDP%');
    const total = Number(((await totalQuery.count('* as total').first()) as any)?.total || 0);

    const messages = await db('messages')
      .where({ 'messages.receiver_id': userId })
      .where('messages.content', 'like', '%DDP%')
      .leftJoin('users', 'messages.sender_id', 'users.id')
      .select(
        'messages.id',
        'messages.sender_id',
        'messages.content',
        'messages.is_read',
        'messages.created_at',
        'users.display_name as sender_name',
        'users.company_name as sender_company',
        'users.avatar as sender_avatar',
      )
      .orderBy('messages.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const result = [];
    for (const msg of messages) {
      // 检查海外代理是否已回复该询价
      const replyRow = await db('messages')
        .where({ sender_id: userId, receiver_id: msg.sender_id })
        .where('created_at', '>', msg.created_at)
        .count('* as total').first() as any;

      result.push({
        id: msg.id,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name,
        sender_company: msg.sender_company,
        sender_avatar: msg.sender_avatar,
        content: msg.content,
        is_read: !!msg.is_read,
        has_replied: Number(replyRow?.total || 0) > 0,
        created_at: msg.created_at,
      });
    }

    res.json({ data: result, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ════════════════════════════════════════════════
// Helper: 信用分计算 (0-100)
// 公式与 /api/cooperations/credit-score/:userId 一致
// ════════════════════════════════════════════════
async function calculateCreditScore(userId: string): Promise<number> {
  try {
    // 1. 评价统计
    let avgRating = 0;
    let reviewCount = 0;
    try {
      const reviews = await db('reviews').where({ reviewee_id: userId }).select('rating');
      reviewCount = reviews.length;
      avgRating = reviewCount > 0
        ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviewCount
        : 0;
    } catch {
      // reviews 表不存在时静默跳过
    }

    // 2. 已确认的合作数
    let totalCoops = 0;
    try {
      const coopRow = await db('cooperations')
        .where(function () { this.where({ agent_user_id: userId }).orWhere({ forwarder_user_id: userId }); })
        .where({ status: 'confirmed' })
        .count('* as total').first() as any;
      totalCoops = Number(coopRow?.total || 0);
    } catch { /* ignore */ }

    // 3. 争议数
    let totalDisputes = 0;
    try {
      const disputeRow = await db('dispute_cases')
        .where({ respondent_id: userId })
        .count('* as total').first() as any;
      totalDisputes = Number((disputeRow as any)?.total || 0);
    } catch { /* ignore */ }

    // 4. 名片认证 + 注册天数
    let hasCard = false;
    let daysSinceReg = 0;
    try {
      const user = await db('users').where({ id: userId }).first() as any;
      hasCard = !!user?.card_image;
      daysSinceReg = user?.created_at
        ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
        : 0;
    } catch { /* ignore */ }

    // ── 公式 ──
    let score = 50; // 基础分
    if (reviewCount > 0) {
      score += (avgRating / 5) * 30;
    } else {
      score += 10; // 暂无评价给基础分
    }
    score += Math.min(totalCoops, 50) * 0.5; // 合作数满分 25
    score -= totalDisputes * 15;             // 每条争议扣 15
    if (hasCard) score += 10;                // 名片认证
    if (daysSinceReg >= 365) score += 5;     // 满一年

    return Math.max(0, Math.min(100, Math.round(score)));
  } catch {
    return 50; // 任意异常返回基础分
  }
}

export default router;
