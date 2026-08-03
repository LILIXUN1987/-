import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authRequired } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import db from '../config/database';
import logger from '../utils/logger';
import { getEffectivePlan, getPlanLimits, PLAN_LIMITS, PLAN_PRICES, OVERSEAS_PLAN_LIMITS, OVERSEAS_PLAN_PRICES, getOverseasPrices, getCountryZone, type PlanTier } from '../services/plan.service';
import { getProbationStatus } from '../services/probation.service';

const router = Router();
router.use(authRequired);

// ════════════════════════════════════════════
// 1. 获取用户当前套餐信息
// ════════════════════════════════════════════
router.get('/info', async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await db('users').where({ id: userId }).first() as any;
    const role = user?.role || '';
    const plan = await getEffectivePlan(userId);
    const limits = getPlanLimits(plan.tier, role);
    const isOverseasAgent = role === 'overseas_agent';

    // 统计当月已发布舱位数
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    let cargoPosted = 0;
    try {
      const row = await db('cargo_spaces')
        .where({ uploaded_by: userId })
        .where('created_at', '>=', monthStart.toISOString())
        .count('* as total').first() as any;
      cargoPosted = Number(row?.total || 0);
    } catch { /* no cargo_spaces table */ }

    // 统计当月DDP询价接收数（海外代理专用）
    let ddpInquiriesThisMonth = 0;
    if (isOverseasAgent) {
      try {
        const row = await db('messages')
          .where({ receiver_id: userId })
          .where('content', 'like', '%DDP%')
          .where('created_at', '>=', monthStart.toISOString())
          .count('* as total').first() as any;
        ddpInquiriesThisMonth = Number(row?.total || 0);
      } catch { /* ignore */ }
    }

    // 获取海外代理所在国家 → 定价区
    let overseasZone = undefined;
    let overseasZoneLabel = undefined;
    let zonePricing = OVERSEAS_PLAN_PRICES;
    if (isOverseasAgent) {
      try {
        const agent = await db('ddp_agents').where({ created_by: userId }).first() as any;
        if (agent?.country) {
          overseasZone = getCountryZone(agent.country);
          zonePricing = getOverseasPrices(agent.country);
        }
      } catch {}
    }

    res.json({
      tier: plan.tier,
      trialEnd: plan.trialEnd,
      isExpired: plan.isExpired,
      limits,
      usage: {
        cargoPosted,
        maxCargoPosts: limits.maxCargoPosts,
        inquiries: 0,
        maxInquiries: limits.maxInquiries,
        ddpInquiriesThisMonth,
        maxDdpInquiries: limits.maxDdpInquiries,
      },
      overseasZone,
      overseasZoneLabel,
      allPlans: Object.entries(isOverseasAgent ? zonePricing : PLAN_PRICES).map(([tier, info]: [string, any]) => ({
        tier,
        price: info.price,
        label: info.label,
        currency: info.currency || 'CNY',
        limits: isOverseasAgent ? OVERSEAS_PLAN_LIMITS[tier as PlanTier] : PLAN_LIMITS[tier as PlanTier],
      })),
    });
  } catch (err) { res.status(500).json({ error: '查询失败' }); }
});

// ════════════════════════════════════════════
// 2. 升级/降级套餐（配合支付使用 — 暂仅管理员操作）
// ════════════════════════════════════════════
router.post('/change', requireAdmin, async (req, res) => {
  try {
    const { tier } = req.body;
    if (!['free', 'standard', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: '无效套餐' });
    }
    await db('users').where({ id: req.user!.id }).update({
      plan_tier: tier,
      plan_updated_at: new Date().toISOString(),
    });
    res.json({ message: '套餐已更新' });
  } catch (err) { res.status(500).json({ error: '更新失败' }); }
});

// ════════════════════════════════════════════
// 3. 展会通讯录下载（10元/次）
// ════════════════════════════════════════════
router.post('/download-contacts', async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await db('users').where({ id: userId }).first() as any;

    // 检查余额或直接创建支付订单（对接现有支付系统）
    // 简化处理：直接创建一条下载记录，后续与支付打通
    const downloadId = uuidv4();
    await db('contact_downloads').insert({
      id: downloadId,
      user_id: userId,
      amount: 10.00,
      contact_count: 0,
    });

    // 从通讯录表获取数据
    let contacts: any[] = [];
    try {
      contacts = await db('user_cards')
        .select('company_name', 'display_name', 'phone', 'email', 'position')
        .orderByRaw('random()')
        .limit(500);
    } catch {
      // user_cards表可能不存在，使用users表代替
      contacts = await db('users')
        .select('company_name', 'display_name', 'phone', 'email')
        .where('role', 'forwarder')
        .orderByRaw('random()')
        .limit(500);
    }

    if (contacts.length < 500) {
      // 不足500条时填充满
      logger.warn(`通讯录不足500条(${contacts.length})，返回实际数量`);
    }

    await db('contact_downloads').where({ id: downloadId }).update({ contact_count: contacts.length });

    res.json({
      message: `已下载 ${contacts.length} 条通讯录`,
      count: contacts.length,
      data: contacts,
    });
  } catch (err) {
    logger.error('通讯录下载失败:', err);
    res.status(500).json({ error: '下载失败' });
  }
});

// ════════════════════════════════════════════
// 4. 我购买的通讯录下载历史
// ════════════════════════════════════════════
router.get('/my-downloads', async (req, res) => {
  try {
    const data = await db('contact_downloads')
      .where({ user_id: req.user!.id })
      .orderBy('created_at', 'desc')
      .limit(20);
    res.json({ data });
  } catch (err) { res.status(500).json({ error: '查询失败' }); }
});

// ════════════════════════════════════════════
// 5. 货代考核状态查询
// ════════════════════════════════════════════
router.get('/probation', async (req, res) => {
  try {
    const data = await getProbationStatus(req.user!.id);
    res.json(data || { enrolled: false });
  } catch (err) { res.status(500).json({ error: '查询失败' }); }
});

export default router;
