import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authRequired } from '../middleware/auth.middleware';
import db from '../config/database';
import logger from '../utils/logger';

const router = Router();
router.use(authRequired);

/** 管理员鉴权中间件 */
async function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: '仅管理员可操作' });
  }
  next();
}

/** 获取当前月份字符串 */
function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

// ── 获取激活的报关行列表（用于口岸选择，所有用户可查） ──
router.get('/active-brokers', async (req, res) => {
  try {
    const brokers = await db('customs_brokers')
      .where({ is_active: true })
      .select('id', 'company_name', 'port_code', 'port_name', 'unit_price', 'daily_limit')
      .orderBy('port_code', 'asc');
    res.json({ data: brokers });
  } catch (err) { logger.error('[coupon] active brokers error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 1. 订阅状态查询（基于 trial_end 判断是否已付费）
// ══════════════════════════════════════════════════════════════
router.get('/my-subscription', async (req, res) => {
  try {
    const user = await db('users').where({ id: req.user!.id }).first() as any;
    if (!user) return res.json({ subscribed: false });

    const trialEnd = user.trial_end ? new Date(user.trial_end + 'T23:59:59') : null;
    const hasActiveSubscription = trialEnd && trialEnd > new Date();

    // 统计已发放/已赠送/已使用的券数
    const allCoupons = await db('customs_coupons').where({ forwarder_id: req.user!.id });
    const totalIssued = allCoupons.length;
    const sent = allCoupons.filter((c: any) => c.status === 'sent').length;
    const used = allCoupons.filter((c: any) => c.status === 'used').length;
    const availableToSend = allCoupons.filter((c: any) => c.status === 'issued').length;

    res.json({
      subscribed: !!hasActiveSubscription,
      trialEnd: user.trial_end,
      totalIssued,
      sent,
      used,
      availableToSend,
    });
  } catch (err) { logger.error('[coupon] subscription status error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 2. 开通月费订阅
// ══════════════════════════════════════════════════════════════
router.post('/subscribe', async (req, res) => {
  try {
    const existing = await db('monthly_subscriptions')
      .where({ user_id: req.user!.id, status: 'active' }).first();
    if (existing) return res.status(400).json({ error: '您已开通月费订阅' });

    const month = getCurrentMonth();
    const subId = uuidv4();
    const planTier = (req.body.plan_tier || 'standard') as string;
    const isPro = planTier === 'pro';

    await db('monthly_subscriptions').insert({
      id: subId,
      user_id: req.user!.id,
      status: 'active',
      current_month: month,
      amount: isPro ? 49.90 : 19.90,
      last_paid_at: new Date().toISOString(),
    });

    const userId = req.user!.id;
    const couponIds: string[] = [];

    // 从池中领取券（认领后为 issued，货代持有但尚未赠出给外贸）
    async function claimFromPool(faceValue: number): Promise<string | null> {
      const pool = await db('customs_coupons')
        .where('status', 'issued').whereNotNull('broker_id').whereNull('trader_id')
        .whereNull('sent_at') // ← 未被认领的池中券
        .where('face_value', faceValue)
        .orderBy('created_at', 'asc')
        .first();
      if (pool) {
        await db('customs_coupons').where({ id: pool.id }).update({
          forwarder_id: userId,
          status: 'issued', // ← 认领后仍为 issued（持有但未赠出）
          sent_at: db.fn.now(), // ← 标记已认领（但未真正送出）
        });
        return pool.id;
      }
      return null;
    }

    // 加权随机面值：¥50仅10%，¥30占30%，¥20占30%，¥10占30%
    const weightedRandomFaceValue = () => {
      const r = Math.random() * 100;
      if (r < 10) return 50;      // 10%
      if (r < 40) return 30;      // 30%
      if (r < 70) return 20;      // 30%
      return 10;                   // 30%
    };

    if (isPro) {
      // 专业版：领2张券
      let claimed = 0;
      for (let i = 0; i < 2; i++) {
        for (const fv of [50, 30, 20, 10]) {
          const pool = await claimFromPool(fv);
          if (pool) { couponIds.push(pool); claimed++; break; }
        }
      }
      while (claimed < 2) {
        const fv = weightedRandomFaceValue();
        const cid = uuidv4();
        await db('customs_coupons').insert({
          id: cid, subscription_id: subId, forwarder_id: userId,
          face_value: fv, month, status: 'issued',
        });
        couponIds.push(cid);
        claimed++;
      }
    } else {
      // 标准版：领1张券，优先从池中按面值大小领取
      let claimed = false;
      for (const fv of [50, 30, 20, 10]) {
        const pool = await claimFromPool(fv);
        if (pool) { couponIds.push(pool); claimed = true; break; }
      }
      if (!claimed) {
        const fv = weightedRandomFaceValue();
        const cid = uuidv4();
        await db('customs_coupons').insert({
          id: cid, subscription_id: subId, forwarder_id: userId,
          face_value: fv, month, status: 'issued',
        });
        couponIds.push(cid);
      }
    }

    res.json({
      message: '✅ 订阅已开通' + (couponIds.length > 0 ? '，已领取 ' + couponIds.length + ' 张报关券' : ''),
      couponIds,
      planTier,
    });
  } catch (err) { logger.error('[coupon] subscribe error:', err); res.status(500).json({ error: '开通失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 3. 取消订阅
// ══════════════════════════════════════════════════════════════
router.post('/unsubscribe', async (req, res) => {
  try {
    await db('monthly_subscriptions')
      .where({ user_id: req.user!.id, status: 'active' })
      .update({ status: 'cancelled' });
    res.json({ message: '已取消订阅，下月起不再发放报关券' });
  } catch (err) { logger.error('[coupon] unsubscribe error:', err); res.status(500).json({ error: '取消失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 4. 外贸活跃用户列表（供货代选择赠送券）
// ══════════════════════════════════════════════════════════════
router.get('/traders', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    // 获取外贸用户 + 近期活跃数据
    const traders = await db('users')
      .leftJoin('search_logs', function () {
        this.on('users.id', '=', 'search_logs.user_id')
          .andOn('search_logs.created_at', '>=', db.raw("datetime('now', '-7 days')"));
      })
      .where('users.role', 'trader')
      .where('users.status', 'approved')
      .select(
        'users.id',
        'users.display_name',
        'users.company_name',
        db.raw('COUNT(DISTINCT search_logs.id) as search_count'),
        db.raw("MAX(search_logs.created_at) as last_search_at"),
      )
      .groupBy('users.id')
      .orderBy('search_count', 'desc')
      .limit(limit).offset(offset);

    // 额外获取每个外贸的询价次数（最近7天从messages表）
    const traderIds = traders.map((t: any) => t.id);
    let inquiryCounts: Record<string, number> = {};
    if (traderIds.length > 0) {
      const inquiries = await db('messages')
        .whereIn('sender_id', traderIds)
        .where('created_at', '>=', db.raw("datetime('now', '-7 days')"))
        .select('sender_id', db.raw('COUNT(*) as cnt'))
        .groupBy('sender_id');
      for (const r of inquiries) inquiryCounts[r.sender_id] = Number(r.cnt);
    }

    const result = traders.map((t: any) => ({
      id: t.id,
      displayName: t.display_name,
      companyName: t.company_name,
      searchCount: Number(t.search_count || 0),
      inquiryCount: inquiryCounts[t.id] || 0,
      lastActive: t.last_search_at || null,
    }));

    const [{ total }] = await db('users').where({ role: 'trader', status: 'approved' }).count('* as total');
    res.json({ data: result, total: Number(total), page, limit });
  } catch (err) { logger.error('[coupon] traders list error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 5. 赠赠送券给指定外贸用户
// ══════════════════════════════════════════════════════════════
router.post('/send', async (req, res) => {
  try {
    const { traderId } = req.body;
    if (!traderId) return res.status(400).json({ error: '请选择接收用户' });

    // 检查外贸用户是否存在
    const trader = await db('users').where({ id: traderId, role: 'trader' }).first();
    if (!trader) return res.status(404).json({ error: '外贸用户不存在' });

    // 获取当前用户未送出的当月券（优先送出从池中认领的，有broker_id的排前面）
    const month = getCurrentMonth();
    const coupon = await db('customs_coupons')
      .where({ forwarder_id: req.user!.id, month, status: 'issued' })
      .orderByRaw('CASE WHEN broker_id IS NOT NULL THEN 0 ELSE 1 END')
      .first();
    if (!coupon) return res.status(400).json({ error: '本月无可用券，请先开通月费订阅' });

    // 检查该外贸本月是否已收到过多张券（每人每月限收3张防轰炸）
    const receivedCount = await db('customs_coupons')
      .where({ trader_id: traderId, month })
      .whereIn('status', ['sent', 'used'])
      .count('* as total').first();
    if (Number((receivedCount as any)?.total || 0) >= 3) {
      return res.status(400).json({ error: '该用户本月已收到3张券，暂不能继续赠送' });
    }

    // 赠送券
    await db('customs_coupons').where({ id: coupon.id }).update({
      trader_id: traderId,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    // 给外贸发送站内信通知（用系统账号发送，附带赠送人信息）
    const forwarder = await db('users').where({ id: req.user!.id }).first() as any;
    const systemUser = await db('users').where({ username: 'admin' }).first() as any;
    if (systemUser) {
      await db('messages').insert({
        id: uuidv4(),
        sender_id: systemUser.id,
        receiver_id: traderId,
        content: `🎫 ${forwarder.display_name || '一位货代'}（${forwarder.company_name || ''}）向您赠送了一张50元报关券！\n可在「我的券包」中查看和使用。\n━━━━━━━━━━━━━━━━━━━━\n赠券人：${forwarder.display_name || ''} ${forwarder.company_name || ''}`,
        created_at: new Date().toISOString(),
      });
    }

    res.json({ message: `✅ 已赠送报关券给 ${trader.display_name || trader.company_name || ''}` });
  } catch (err) { logger.error('[coupon] send error:', err); res.status(500).json({ error: '赠送失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 6. 我的券统计（货代视角 - 收到/送出/现存/有效期）
// ══════════════════════════════════════════════════════════════
router.get('/my-stats', async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await db('users').where({ id: userId }).first() as any;
    if (!user) return res.json({ stats: null });

    const role = user.role;
    let allCoupons: any[] = [];
    let tradertotalReceived = 0;

    if (role === 'forwarder' || role === 'admin') {
      // 货代视角：自己的券
      allCoupons = await db('customs_coupons').where({ forwarder_id: userId }).orderBy('month', 'desc');
    } else if (role === 'trader') {
      // 外贸视角：收到的券
      allCoupons = await db('customs_coupons').where({ trader_id: userId }).orderBy('month', 'desc');
      tradertotalReceived = allCoupons.length;
    }

    const totalIssued = allCoupons.length;
    const available = allCoupons.filter((c: any) => c.status === 'issued').length;
    const sent = allCoupons.filter((c: any) => c.status === 'sent').length;
    const used = allCoupons.filter((c: any) => c.status === 'used').length;
    const expired = allCoupons.filter((c: any) => c.status === 'expired').length;

    // 总面值统计
    const totalFaceValue = allCoupons.reduce((s, c) => s + Number(c.face_value || 0), 0);
    const usedFaceValue = allCoupons.filter((c: any) => c.status === 'used').reduce((s, c) => s + Number(c.face_value || 0), 0);
    const availableFaceValue = allCoupons.filter((c: any) => c.status === 'issued').reduce((s, c) => s + Number(c.face_value || 0), 0);

    // 有效期信息
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = nextMonthDate.toISOString().slice(0, 7);

    // 找出最近的有效月份
    const months = [...new Set(allCoupons.map((c: any) => c.month))].sort();
    const latestMonth = months[months.length - 1] || currentMonth;

    // 判断当前月券是否可用
    const currentMonthCoupons = allCoupons.filter((c: any) => c.month === currentMonth);
    const hasCurrentMonthAvailable = currentMonthCoupons.some((c: any) => c.status === 'issued' || c.status === 'sent');

    // 每月统计
    const byMonth: Record<string, { issued: number; sent: number; used: number; expired: number; available: number }> = {};
    for (const c of allCoupons) {
      if (!byMonth[c.month]) byMonth[c.month] = { issued: 0, sent: 0, used: 0, expired: 0, available: 0 };
      byMonth[c.month].issued++;
      if (c.status === 'sent') byMonth[c.month].sent++;
      if (c.status === 'used') byMonth[c.month].used++;
      if (c.status === 'expired') byMonth[c.month].expired++;
      if (c.status === 'issued') byMonth[c.month].available++;
    }

    // 各面值统计
    const byFaceValue: Record<string, { count: number; total: number }> = {};
    for (const c of allCoupons) {
      const fv = String(c.face_value);
      if (!byFaceValue[fv]) byFaceValue[fv] = { count: 0, total: 0 };
      byFaceValue[fv].count++;
      byFaceValue[fv].total += Number(c.face_value);
    }

    res.json({
      role,
      stats: {
        totalIssued,    // 累计收到
        available,       // 现存可送/可用
        sent,            // 已送出
        used,            // 已核销
        expired,         // 已过期
        totalFaceValue,
        usedFaceValue,
        availableFaceValue,
        currentMonth,
        latestMonth,
        hasCurrentMonthAvailable,
        monthly: Object.entries(byMonth).map(([m, d]) => ({ month: m, ...d })),
        byFaceValue: Object.entries(byFaceValue).map(([fv, d]) => ({ faceValue: Number(fv), ...d })),
        // 有效期：券的有效月份范围
        expiryRange: months.length > 0
          ? { from: months[0], to: months[months.length - 1] }
          : null,
      },
    });
  } catch (err) { logger.error('[coupon] my-stats error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 7. 我的券列表（货代视角/外贸视角）
// ══════════════════════════════════════════════════════════════
router.get('/my-coupons', async (req, res) => {
  try {
    const role = req.query.role as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    let coupons, total;

    if (role === 'trader') {
      // 外贸视角：收到的券
      const query = db('customs_coupons')
        .leftJoin('users as fw', 'customs_coupons.forwarder_id', 'fw.id')
        .where('customs_coupons.trader_id', req.user!.id)
        .select(
          'customs_coupons.*',
          'fw.display_name as forwarder_name',
          'fw.company_name as forwarder_company',
        )
        .orderBy('customs_coupons.created_at', 'desc');
      total = await db('customs_coupons').where({ trader_id: req.user!.id }).count('* as total').first();
      coupons = await query.limit(limit).offset(offset);
    } else {
      // 货代视角：送出的券 + 从池子领取的券
      const query = db('customs_coupons')
        .leftJoin('users as tr', 'customs_coupons.trader_id', 'tr.id')
        .leftJoin('customs_brokers as cb', 'customs_coupons.broker_id', 'cb.id')
        .where('customs_coupons.forwarder_id', req.user!.id)
        .select(
          'customs_coupons.*',
          'tr.display_name as trader_name',
          'tr.company_name as trader_company',
          'cb.company_name as broker_company',
          'cb.port_name as broker_port',
        )
        .orderBy('customs_coupons.created_at', 'desc');
      total = await db('customs_coupons').where({ forwarder_id: req.user!.id }).count('* as total').first();
      coupons = await query.limit(limit).offset(offset);
    }

    res.json({
      data: coupons.map((c: any) => ({
        id: c.id,
        faceValue: Number(c.face_value),
        month: c.month,
        status: c.status,
        sentAt: c.sent_at,
        usedAt: c.used_at,
        createdAt: c.created_at,
        traderName: c.trader_name,
        traderCompany: c.trader_company,
        forwarderName: c.forwarder_name,
        forwarderCompany: c.forwarder_company,
        brokerCompany: c.broker_company,
        brokerPort: c.broker_port,
      })),
      total: Number((total as any)?.total || 0),
      page, limit,
    });
  } catch (err) { logger.error('[coupon] list error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 7. 使用券（外贸用户）
// ══════════════════════════════════════════════════════════════
router.post('/use', async (req, res) => {
  try {
    const { couponId, declInfo } = req.body;
    if (!couponId) return res.status(400).json({ error: '请选择要使用的券' });

    // 检查券是否属于当前用户
    const coupon = await db('customs_coupons')
      .where({ id: couponId, trader_id: req.user!.id, status: 'sent' })
      .first();
    if (!coupon) return res.status(404).json({ error: '券不存在或已使用' });

    // 取第一个激活的报关行
    const broker = await db('customs_brokers').where({ is_active: true }).first();

    // 创建使用记录
    const usageId = uuidv4();
    await db('coupon_usage_records').insert({
      id: usageId,
      coupon_id: couponId,
      broker_id: broker?.id || null,
      trader_id: req.user!.id,
      status: 'pending',
      decl_info: declInfo ? JSON.stringify(declInfo) : null,
    });

    // 更新券状态
    await db('customs_coupons').where({ id: couponId }).update({
      status: 'used',
      used_at: new Date().toISOString(),
    });

    // 通知赠送的货代
    await db('messages').insert({
      id: uuidv4(),
      sender_id: req.user!.id,
      receiver_id: coupon.forwarder_id,
      content: `🎉 您赠送的报关券已被使用！外贸用户已提交报关申请。`,
      created_at: new Date().toISOString(),
    });
    // 推送 + 邮件通知货代
    try {
      const fwUser = await db('users').where({ id: coupon.forwarder_id }).first() as any;
      if (fwUser?.email && fwUser?.email_verified) {
        const { sendCouponUsedEmail } = await import('../services/email.service');
        await sendCouponUsedEmail(fwUser.email, fwUser.display_name, coupon.face_value);
      }
      const { sendPushNotification } = await import('../services/push.service');
      await sendPushNotification(coupon.forwarder_id, '报关券已使用', `您的 ¥${coupon.face_value} 报关券已被外贸用户使用`);
    } catch {}
    if (coupon.broker_id) {
      try {
        // 检查该用户之前是否用过同一报关行的券
        const priorUse = await db('coupon_usage_records')
          .leftJoin('customs_coupons', 'coupon_usage_records.coupon_id', 'customs_coupons.id')
          .where('coupon_usage_records.broker_id', coupon.broker_id)
          .where('customs_coupons.forwarder_id', req.user!.id)
          .whereNot('coupon_usage_records.status', 'pending')
          .count('* as total').first();
        if (Number((priorUse as any)?.total || 0) >= 2) {
          // 这是第二次及以上使用 = 回头客
          await db('customs_brokers').where({ id: coupon.broker_id }).increment('return_customer_count', 1);
        }
      } catch {}
    }

    res.json({ message: '✅ 券已提交使用，报关行将尽快处理', usageId });
  } catch (err) { logger.error('[coupon] use error:', err); res.status(500).json({ error: '使用失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 8. 使用记录查询
// ══════════════════════════════════════════════════════════════
router.get('/usage-history', async (req, res) => {
  try {
    const records = await db('coupon_usage_records as cur')
      .leftJoin('customs_coupons as cc', 'cur.coupon_id', 'cc.id')
      .leftJoin('users as fw', 'cc.forwarder_id', 'fw.id')
      .where('cur.trader_id', req.user!.id)
      .select(
        'cur.*',
        'fw.display_name as forwarder_name',
        'fw.company_name as forwarder_company',
      )
      .orderBy('cur.created_at', 'desc')
      .limit(20);
    res.json({ data: records });
  } catch (err) { logger.error('[coupon] usage history error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 9. 报关行待处理订单列表
// ══════════════════════════════════════════════════════════════
router.get('/broker/orders', async (req, res) => {
  try {
    // 找当前用户关联的报关行
    const broker = await db('customs_brokers').where({ created_by: req.user!.id }).first();
    if (!broker) return res.status(400).json({ error: '请先完善报关行档案' });

    const orders = await db('coupon_usage_records as cur')
      .leftJoin('customs_coupons as cc', 'cur.coupon_id', 'cc.id')
      .leftJoin('users as tr', 'cur.trader_id', 'tr.id')
      .where('cur.broker_id', broker.id)
      .where('cur.status', 'pending')
      .select(
        'cur.id',
        'cur.status',
        'cur.decl_info',
        'cur.created_at',
        'cur.broker_id',
        'tr.display_name as trader_name',
        'tr.company_name as trader_company',
      )
      .orderBy('cur.created_at', 'asc')
      .limit(20);
    res.json({ data: orders });
  } catch (err) { logger.error('[coupon] broker orders error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 10. 报关行完成订单
// ══════════════════════════════════════════════════════════════
router.post('/broker/complete', async (req, res) => {
  try {
    const { usageId, customsDeclNumber, itemCount, inspectionFee } = req.body;
    if (!usageId || !customsDeclNumber) return res.status(400).json({ error: '缺少参数' });

    // 验证当前登录的报关行有权限完成此订单
    const broker = await db('customs_brokers').where({ created_by: req.user!.id }).first();
    if (!broker) return res.status(403).json({ error: '未找到报关行档案' });

    const record = await db('coupon_usage_records').where({ id: usageId, status: 'pending', broker_id: broker.id }).first();
    if (!record) return res.status(404).json({ error: '订单不存在或已处理' });

    // 超过5项收续页费
    const items = itemCount || 0;
    let extraFee = 0;
    if (items > 5) {
      const extraPages = Math.ceil((items - 5) / 5);
      extraFee = extraPages * 30;
    }

    await db('coupon_usage_records').where({ id: usageId }).update({
      status: 'completed',
      customs_decl_number: customsDeclNumber,
      item_count: items,
      extra_fee: extraFee || null,
      inspection_fee: inspectionFee || null,
      completed_at: new Date().toISOString(),
    });

    res.json({ message: '✅ 报关完成已确认', extraFee });
  } catch (err) { logger.error('[coupon] broker complete error:', err); res.status(500).json({ error: '操作失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 11. 管理员：报关行列表
// ══════════════════════════════════════════════════════════════
router.get('/admin/brokers', requireAdmin, async (req, res) => {
  try {
    const brokers = await db('customs_brokers').orderBy('created_at', 'desc');
    res.json({ data: brokers });
  } catch (err) { logger.error('[coupon] admin brokers error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 12. 管理员：新增/编辑报关行
// ══════════════════════════════════════════════════════════════
router.post('/admin/brokers', requireAdmin, async (req, res) => {
  try {
    const { id, company_name, contact_person, phone, port_code, port_name, unit_price, daily_limit, is_active } = req.body;
    if (!company_name) return res.status(400).json({ error: '请填写公司名' });

    if (id) {
      await db('customs_brokers').where({ id }).update({
        company_name, contact_person, phone, port_code, port_name,
        unit_price: unit_price || 50, daily_limit: daily_limit || 50,
        is_active: is_active !== false,
      });
      res.json({ message: '已更新' });
    } else {
      await db('customs_brokers').insert({
        id: uuidv4(), company_name, contact_person, phone,
        port_code: port_code || '5141', port_name: port_name || '广州白云机场',
        unit_price: unit_price || 50, daily_limit: daily_limit || 50,
        is_active: is_active !== false,
      });
      res.json({ message: '已添加' });
    }
  } catch (err) { logger.error('[coupon] admin brokers save error:', err); res.status(500).json({ error: '保存失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 13. 管理员：券使用统计
// ══════════════════════════════════════════════════════════════
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [issuedCount, sentCount, usedCount, expiredCount, pendingOrders, completedOrders] = await Promise.all([
      db('customs_coupons').count('* as total').first(),
      db('customs_coupons').where({ status: 'sent' }).count('* as total').first(),
      db('customs_coupons').where({ status: 'used' }).count('* as total').first(),
      db('customs_coupons').where({ status: 'expired' }).count('* as total').first(),
      db('coupon_usage_records').where({ status: 'pending' }).count('* as total').first(),
      db('coupon_usage_records').where({ status: 'completed' }).count('* as total').first(),
    ]);

    // 各状态金额统计
    const issuedAmount = await db('customs_coupons').whereNotNull('broker_id').where('status', 'issued').sum('face_value as total').first();
    const sentAmount = await db('customs_coupons').sum('face_value as total').where({ status: 'sent' }).first();
    const usedAmount = await db('customs_coupons').sum('face_value as total').where({ status: 'used' }).first();
    const expiredAmount = await db('customs_coupons').sum('face_value as total').where({ status: 'expired' }).first();

    // 分金额统计
    const byDenom = await db('customs_coupons')
      .select('face_value', 'status')
      .select(db.raw('COUNT(*) as cnt'))
      .groupBy('face_value')
      .groupBy('status')
      .orderBy('face_value', 'asc');

    // 本月数据
    const month = new Date().toISOString().slice(0, 7);
    const [subCount, monthUsed] = await Promise.all([
      db('monthly_subscriptions').where({ status: 'active' }).count('* as total').first(),
      db('customs_coupons').where({ month, status: 'used' }).count('* as total').first(),
    ]);

    // 报关行投放排名
    const brokerRows = await db('customs_brokers').select('company_name', 'total_contributed', 'remaining_contributed').orderBy('total_contributed', 'desc');

    res.json({
      totalIssued: Number((issuedCount as any)?.total || 0),
      totalSent: Number((sentCount as any)?.total || 0),
      totalUsed: Number((usedCount as any)?.total || 0),
      totalExpired: Number((expiredCount as any)?.total || 0),
      pendingOrders: Number((pendingOrders as any)?.total || 0),
      completedOrders: Number((completedOrders as any)?.total || 0),
      activeSubscriptions: Number((subCount as any)?.total || 0),
      monthUsed: Number((monthUsed as any)?.total || 0),
      amountStats: {
        issuedAmount: Number((issuedAmount as any)?.total || 0),
        sentAmount: Number((sentAmount as any)?.total || 0),
        usedAmount: Number((usedAmount as any)?.total || 0),
        expiredAmount: Number((expiredAmount as any)?.total || 0),
      },
      byDenom: byDenom.map(function(r) { return { faceValue: Number(r.face_value), status: r.status, count: Number(r.cnt) }; }),
      brokers: brokerRows.map(function(b) { return { companyName: b.company_name, totalLaunchd: b.total_contributed || 0, remainingLaunchd: b.remaining_contributed || 0 }; }),
    });
  } catch (err) { logger.error('[coupon] admin stats error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 14. 管理员：周结确认
// ══════════════════════════════════════════════════════════════
router.post('/admin/settlement', requireAdmin, async (req, res) => {
  try {
    const { brokerId, weekEnding } = req.body;
    const endDate = weekEnding || new Date().toISOString().split('T')[0];
    // 7天前的日期
    const startDate = new Date(new Date(endDate).getTime() - 7 * 86400000).toISOString().split('T')[0];

    const records = await db('coupon_usage_records')
      .where({ broker_id: brokerId || null, status: 'completed', settled: false })
      .where('completed_at', '>=', startDate)
      .where('completed_at', '<=', endDate + 'T23:59:59')
      .select('*');

    if (records.length === 0) return res.status(400).json({ error: '本期无待结算记录' });

    const totalAmount = records.reduce((sum: number, r: any) => sum + 50 + (Number(r.extra_fee) || 0) + (Number(r.inspection_fee) || 0), 0);

    // 标记结算
    const ids = records.map((r: any) => r.id);
    await db('coupon_usage_records').whereIn('id', ids).update({
      settled: true,
      settled_at: new Date().toISOString(),
    });

    res.json({
      message: `✅ 已结算 ${records.length} 票，合计 ¥${totalAmount}`,
      count: records.length,
      amount: totalAmount,
    });
  } catch (err) { logger.error('[coupon] settlement error:', err); res.status(500).json({ error: '结算失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 15. 定时任务：月度发券（每月1日自动发放上月已付费订阅券）
// ══════════════════════════════════════════════════════════════
router.post('/cron/issue-monthly', async (req, res) => {
  try {
    const thisMonth = new Date().toISOString().slice(0, 7);

    // 查出所有活跃订阅中 current_month 不等于本月的（即本月尚未发券的）
    const subs = await db('monthly_subscriptions')
      .where({ status: 'active' })
      .where('current_month', '<>', thisMonth)
      .select('*');

    let issued = 0;
    for (const sub of subs) {
      await db('customs_coupons').insert({
        id: uuidv4(),
        subscription_id: sub.id,
        forwarder_id: sub.user_id,
        face_value: 50.00,
        month: thisMonth,
        status: 'issued',
      });
      await db('monthly_subscriptions').where({ id: sub.id }).update({
        current_month: thisMonth,
        last_paid_at: new Date().toISOString(),
      });
      issued++;
    }
    logger.info(`[coupon-cron] 月发券完成：${issued} 张`);
    res.json({ message: `已发放 ${issued} 张券` });
  } catch (err) { logger.error('[coupon] cron issue-monthly error:', err); res.status(500).json({ error: '执行失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 16. 定时任务：每日过期检查（超过2个月未使用的券标记为过期）
// ══════════════════════════════════════════════════════════════
router.post('/cron/check-expiry', async (req, res) => {
  try {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const cutoffMonth = twoMonthsAgo.toISOString().slice(0, 7);

    const result = await db('customs_coupons')
      .whereIn('status', ['issued', 'sent'])
      .where('month', '<', cutoffMonth)
      .update({ status: 'expired' });

    logger.info(`[coupon-cron] 过期检查：${result} 张券已过期`);
    res.json({ message: `已标记 ${result} 张过期券` });
  } catch (err) { logger.error('[coupon] cron check-expiry error:', err); res.status(500).json({ error: '执行失败' }); }
});


// ══════════════════════════════════════════════════════════════
// 16. Broker: 报关行注册/更新档案（自助入驻）
// ══════════════════════════════════════════════════════════════
router.post('/broker/profile', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { company_name, contact_person, phone, port_code, port_name, service_type, can_import, wechat, intro, export_fee, import_fee, commitment_notes, air_ports, sea_ports, import_port } = req.body;
    if (!company_name) return res.status(400).json({ error: '请填写公司名' });
    const validTypes = ['air', 'sea', 'both'];
    if (service_type && !validTypes.includes(service_type)) return res.status(400).json({ error: '服务类型必须为air/sea/both' });

    const existing = await db('customs_brokers').where({ created_by: userId }).first();
    if (existing) {
      await db('customs_brokers').where({ created_by: userId }).update({
        company_name, contact_person, phone, port_code, port_name: port_name || null, service_type: service_type || 'sea',
        can_import: can_import === true || can_import === 'true', wechat, intro,
        export_fee: export_fee || null, import_fee: import_fee || null, commitment_notes, is_active: true,
        air_ports: air_ports || null, sea_ports: sea_ports || null, import_port: import_port || null,
      });
      res.json({ message: '档案已更新' });
    } else {
      await db('customs_brokers').insert({
        id: uuidv4(), company_name, contact_person, phone,
        port_code, port_name: port_name || null, service_type: service_type || 'sea',
        can_import: can_import === true || can_import === 'true',
        wechat, intro, export_fee: export_fee || null, import_fee: import_fee || null, commitment_notes,
        air_ports: air_ports || null, sea_ports: sea_ports || null, import_port: import_port || null,
        unit_price: 50, daily_limit: 50, is_active: true,
        created_by: userId, total_contributed: 0, remaining_contributed: 0,
      });
      res.status(201).json({ message: '入驻成功' });
    }
  } catch (err: any) { logger.error('[broker] profile error:', err.message || err); res.status(500).json({ error: '操作失败: ' + (err.message || '未知错误') }); }
});

// ══════════════════════════════════════════════════════════════
// 17. Broker: 投放报关券
// ══════════════════════════════════════════════════════════════
router.post('/broker/contribute', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { face_value, quantity, transport_mode } = req.body;
    const validValues = [10, 20, 30, 50];
    if (!validValues.includes(face_value)) return res.status(400).json({ error: '金额必须为10/20/30/50元' });
    if (!quantity || quantity < 1 || quantity > 1000) return res.status(400).json({ error: '张数需在1-1000之间' });

    const broker = await db('customs_brokers').where({ created_by: userId }).first();
    if (!broker) return res.status(400).json({ error: '请先完善报关行档案' });

    const coupons = [];
    for (let i = 0; i < quantity; i++) {
      coupons.push({
        id: uuidv4(),
        forwarder_id: userId, // 报关行投放券，暂时挂在自己名下
        broker_id: broker.id,
        face_value,
        port_city: broker.port_name || broker.air_ports?.split(',')[0] || broker.sea_ports?.split(',')[0] || 'ALL',
        transport_mode: transport_mode || 'sea',
        month: new Date().toISOString().slice(0, 7),
        status: 'issued',
        created_at: new Date().toISOString(),
      });
    }
    await db('customs_coupons').insert(coupons);

    await db('customs_brokers').where({ id: broker.id }).update({
      total_contributed: (broker.total_contributed || 0) + quantity,
      remaining_contributed: (broker.remaining_contributed || 0) + quantity,
    });

    logger.info('[broker] ' + broker.company_name + ' contributed ' + quantity + ' x ' + face_value + ' yuan coupons');
    res.json({ message: '已投放 ' + quantity + ' 张 ' + face_value + ' 元报关券', contributed: quantity });
  } catch (err: any) { logger.error('[broker] contribute error:', err.message || err); res.status(500).json({ error: '操作失败: ' + (err.message || '未知错误') }); }
});

// ══════════════════════════════════════════════════════════════
// 17b. Broker: 撤回未认领的券
// ══════════════════════════════════════════════════════════════
router.post('/broker/withdraw', async (req, res) => {
  try {
    const userId = req.user!.id;
    const broker = await db('customs_brokers').where({ created_by: userId }).first();
    if (!broker) return res.status(400).json({ error: '请先完善报关行档案' });

    const { coupon_ids } = req.body;
    if (!coupon_ids || !Array.isArray(coupon_ids) || coupon_ids.length === 0) {
      return res.status(400).json({ error: '请选择要撤回的券' });
    }

    // 只能撤回自己投放的、未被认领的券（sent_at=NULL 表示未认领）
    const deleted = await db('customs_coupons')
      .where({ broker_id: broker.id, status: 'issued' })
      .whereNull('trader_id')
      .whereNull('sent_at')
      .whereIn('id', coupon_ids)
      .delete();

    // 更新统计
    if (deleted > 0) {
      await db('customs_brokers').where({ id: broker.id }).update({
        total_contributed: Math.max(0, (broker.total_contributed || 0) - deleted),
        remaining_contributed: Math.max(0, (broker.remaining_contributed || 0) - deleted),
      });
    }

    logger.info(`[broker] ${broker.company_name} withdrew ${deleted} coupons`);
    res.json({ message: `已撤回 ${deleted} 张券`, deleted });
  } catch (err: any) { logger.error('[broker] withdraw error:', err.message || err); res.status(500).json({ error: '操作失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 18. 用户：按口岸查看可领的券
// ══════════════════════════════════════════════════════════════
router.get('/available-by-port', async (req, res) => {
  try {
    const port = (req.query.port as string || '').trim();
    const mode = (req.query.mode as string || '').trim();
    let query = db('customs_coupons')
      .leftJoin('customs_brokers', 'customs_coupons.broker_id', 'customs_brokers.id')
      .whereNotNull('customs_coupons.broker_id').where('customs_coupons.status', 'issued')
      .whereNull('customs_coupons.trader_id')
      .whereNull('customs_coupons.sent_at'); // ← 未被货代认领的券（sent_at=NULL）
    if (port) query = query.where('customs_coupons.port_city', 'like', '%' + port + '%');
    if (mode === 'air' || mode === 'sea') query = query.where('customs_coupons.transport_mode', mode);
    // 按核销次数降序排列（核销多的报关行排前面）
    query = query.orderBy('customs_brokers.total_contributed', 'desc').orderBy('customs_coupons.created_at', 'desc');

    // Check if user is a paid forwarder（必须有活跃月费订阅，不能只是试用期）
    let isPaidForwarder = false;
    if (req.user?.id) {
      const u = await db('users').where({ id: req.user.id }).first() as any;
      if (u?.role === 'forwarder' && u?.trial_end) {
        const end = new Date(u.trial_end + 'T23:59:59');
        if (end > new Date()) {
          const sub = await db('monthly_subscriptions')
            .where({ user_id: req.user.id, status: 'active' })
            .first();
          if (sub) isPaidForwarder = true;
        }
      }
    }

    const coupons = await query
      .select('customs_coupons.id', 'customs_coupons.face_value', 'customs_coupons.port_city', 'customs_coupons.transport_mode', 'customs_coupons.created_at',
        'customs_brokers.company_name as broker_company', 'customs_brokers.contact_person', 'customs_brokers.phone', 'customs_brokers.total_contributed')
      .orderBy('customs_coupons.created_at', 'desc').limit(50);

    const portStats = await db('customs_coupons')
      .whereNotNull('broker_id').where('status', 'issued').whereNull('trader_id').whereNull('sent_at')
      .select('port_city').select('transport_mode').select(db.raw('COUNT(*) as cnt'))
      .groupBy('port_city').groupBy('transport_mode').orderBy('cnt', 'desc');

    res.json({
      data: coupons.map(function(c) { return {
        id: c.id, faceValue: Number(c.face_value), portCity: c.port_city,
        brokerCompany: c.broker_company, contactPerson: c.contact_person, phone: c.phone, transportMode: c.transport_mode, totalLaunchd: c.total_contributed, createdAt: c.created_at,
      }; }),
      portStats: portStats.map(function(p) { return { port: p.port_city, mode: p.transport_mode, count: Number(p.cnt) }; }),
      total: coupons.length,
      isPaidForwarder,
    });
  } catch (err) { logger.error('[coupon] available-by-port error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 19.【已废弃】手动认领 — 订阅月费时自动发券，无需手动操作
// ══════════════════════════════════════════════════════════════
router.post('/claim', async (_req, res) => {
  res.status(410).json({
    error: '手动认领已取消。开通月费订阅即可自动获得报关券，无需额外操作。',
    code: 'FEATURE_REMOVED',
  });
});

// ══════════════════════════════════════════════════════════════
// 20. Broker: 我的投放统计
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// 21. 报关行详情（公开）
// ══════════════════════════════════════════════════════════════
router.get('/broker/:id/detail', async (req, res) => {
  try {
    const broker = await db('customs_brokers').where({ id: req.params.id }).first();
    if (!broker) return res.status(404).json({ error: '报关行不存在' });
    res.json({
      id: broker.id,
      companyName: broker.company_name,
      contactPerson: broker.contact_person,
      phone: broker.phone,
      wechat: broker.wechat,
      portName: broker.port_name,
      portCode: broker.port_code,
      serviceType: broker.service_type,
      canImport: !!broker.can_import,
      intro: broker.intro,
      exportFee: broker.export_fee, importFee: broker.import_fee,
        feePerDecl: broker.fee_per_decl ? Number(broker.fee_per_decl) : null,
      commitmentNotes: broker.commitment_notes,
      totalLaunchd: broker.total_contributed || 0,
    });
  } catch (err) { logger.error('[broker] detail error:', err); res.status(500).json({ error: '查询失败' }); }
});



// ══════════════════════════════════════════════════════════════
// 23. Broker: 搜索已领取的券（用于线下核销）
// ══════════════════════════════════════════════════════════════
router.get('/broker/search-coupons', async (req, res) => {
  try {
    const q = (req.query.q as string || '').trim();
    const broker = await db('customs_brokers').where({ created_by: req.user!.id }).first();
    if (!broker) return res.json({ data: [] });

    let query = db('customs_coupons')
      .leftJoin('users as fw', 'customs_coupons.forwarder_id', 'fw.id')
      .leftJoin('users as tr', 'customs_coupons.trader_id', 'tr.id')
      .where('customs_coupons.broker_id', broker.id)
      .whereIn('customs_coupons.status', ['issued', 'sent', 'used'])
      .select(
        'customs_coupons.id',
        'customs_coupons.face_value',
        'customs_coupons.status',
        'customs_coupons.broker_id',
        'customs_coupons.created_at',
        'customs_coupons.sent_at',
        'customs_coupons.used_at',
        'fw.display_name as forwarder_name',
        'fw.company_name as forwarder_company',
        'tr.display_name as trader_name',
        'tr.company_name as trader_company',
      )
      .orderBy('customs_coupons.created_at', 'desc')
      .limit(20);

    if (q) {
      if (/^[a-zA-Z0-9-]{20,}$/.test(q)) {
        // 按券ID搜索
        query = db('customs_coupons')
          .leftJoin('users as fw', 'customs_coupons.forwarder_id', 'fw.id')
          .leftJoin('users as tr', 'customs_coupons.trader_id', 'tr.id')
          .where('customs_coupons.broker_id', broker.id)
          .where('customs_coupons.id', q)
          .select(
            'customs_coupons.id', 'customs_coupons.face_value', 'customs_coupons.status',
            'customs_coupons.created_at', 'customs_coupons.sent_at', 'customs_coupons.used_at',
            'fw.display_name as forwarder_name', 'fw.company_name as forwarder_company',
            'tr.display_name as trader_name', 'tr.company_name as trader_company',
          );
      } else {
        // 按公司名搜索
        query = query.where(function() {
          this.where('fw.company_name', 'like', '%' + q + '%')
            .orWhere('fw.display_name', 'like', '%' + q + '%')
            .orWhere('tr.company_name', 'like', '%' + q + '%')
            .orWhere('tr.display_name', 'like', '%' + q + '%');
        });
      }
    }

    const coupons = await query;
    res.json({
      data: coupons.map(function(c) { return {
        id: c.id,
        faceValue: Number(c.face_value),
        status: c.status,
        forwarderName: c.forwarder_name,
        forwarderCompany: c.forwarder_company,
        traderName: c.trader_name,
        traderCompany: c.trader_company,
        sentAt: c.sent_at,
        usedAt: c.used_at,
        createdAt: c.created_at,
      }; }),
      total: coupons.length,
    });
  } catch (err) { logger.error('[broker] search coupons error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 24. Broker: 手动核销券（线下核销后补录）
// ══════════════════════════════════════════════════════════════
router.post('/broker/manual-verify', async (req, res) => {
  try {
    const { couponId, customsDeclNumber, notes } = req.body;
    if (!couponId) return res.status(400).json({ error: '请填写券号' });

    const broker = await db('customs_brokers').where({ created_by: req.user!.id }).first();
    if (!broker) return res.status(403).json({ error: '未找到报关行档案' });

    const coupon = await db('customs_coupons').where({ id: couponId, broker_id: broker.id, status: 'sent' }).first();
    if (!coupon) return res.status(404).json({ error: '券不存在、不属于您或已被使用' });

    // 创建使用记录
    const usageId = uuidv4();
    await db('coupon_usage_records').insert({
      id: usageId,
      coupon_id: couponId,
      broker_id: broker.id,
      trader_id: coupon.trader_id || null,
      status: 'completed',
      customs_decl_number: customsDeclNumber || 'manual-' + Date.now(),
      completed_at: new Date().toISOString(),
      decl_info: notes ? JSON.stringify({ manual_verify: true, notes: notes }) : JSON.stringify({ manual_verify: true }),
    });

    // 更新券状态
    await db('customs_coupons').where({ id: couponId }).update({
      status: 'used',
      used_at: new Date().toISOString(),
    });

    // 扣减剩余
    await db('customs_brokers').where({ id: broker.id }).decrement('remaining_contributed', 1);

    // 通知领券人（如有）
    const notifyUserId = coupon.trader_id || coupon.forwarder_id;
    if (notifyUserId) {
      await db('messages').insert({
        id: uuidv4(), sender_id: req.user!.id, receiver_id: notifyUserId,
        content: '✅ 您的报关券（¥' + coupon.face_value + '）已被报关行 ' + broker.company_name + ' 手动核销。',
        created_at: new Date().toISOString(),
      });
    }

    res.json({ message: '✅ 手动核销成功', usageId });
  } catch (err) { logger.error('[broker] manual verify error:', err); res.status(500).json({ error: '核销失败' }); }
});


// ══════════════════════════════════════════════════════════════
// 25. 用户自助核销券（报关行不核销时，用户自己标记已使用）
// ══════════════════════════════════════════════════════════════
router.post('/my-coupons/self-verify', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { couponId, customsDeclNumber, notes } = req.body;
    if (!couponId) return res.status(400).json({ error: '请选择要核销的券' });

    // 校验：券必须属于当前用户（forwarder_id 或 trader_id）
    const coupon = await db('customs_coupons')
      .where({ id: couponId, status: 'sent' })
      .where(function() {
        this.where('forwarder_id', userId).orWhere('trader_id', userId);
      })
      .first();
    if (!coupon) return res.status(404).json({ error: '券不存在或已使用' });

    // 创建使用记录
    const usageId = require('uuid').v4();
    await db('coupon_usage_records').insert({
      id: usageId,
      coupon_id: couponId,
      broker_id: coupon.broker_id || null,
      trader_id: req.user!.role === 'trader' ? userId : null,
      status: 'completed',
      customs_decl_number: customsDeclNumber || 'self-' + Date.now(),
      completed_at: new Date().toISOString(),
      decl_info: notes ? JSON.stringify({ self_verify: true, notes }) : JSON.stringify({ self_verify: true }),
    });

    // 更新券状态
    await db('customs_coupons').where({ id: couponId }).update({
      status: 'used',
      used_at: new Date().toISOString(),
    });

    // 扣减报关行统计
    if (coupon.broker_id) {
      try { await db('customs_brokers').where({ id: coupon.broker_id }).decrement('remaining_contributed', 1); } catch {}
    }

    res.json({ message: '✅ 已确认使用', usageId });
  } catch (err: any) { logger.error('[coupon] self-verify error:', err.message); res.status(500).json({ error: '操作失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 25. Broker: 自动过期处理（定时任务用，sent超过30天自动过期）
// ══════════════════════════════════════════════════════════════
router.post('/cron/expire-stale', async (req, res) => {
  try {
    // 仅过期 sent 状态的券（已领取但30天未核销）
    // issued 状态的券（池中无人认领的）永不过期，因为是报关行的投放
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const expired = await db('customs_coupons')
      .where('status', 'sent')
      .where('sent_at', '<', thirtyDaysAgo)
      .update({ status: 'expired' });

    if (expired > 0) logger.info('[coupon-cron] 过期处理：' + expired + ' 张已领取未核销券已过期');
    res.json({ message: '已过期 ' + expired + ' 张' });
  } catch (err) { logger.error('[coupon] expire-stale error:', err); res.status(500).json({ error: '执行失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 22. Broker: 我的投放统计
// ══════════════════════════════════════════════════════════════
// 22. Broker: 我的投放统计
// ══════════════════════════════════════════════════════════════
router.get('/broker/stats', async (req, res) => {
  try {
    const broker = await db('customs_brokers').where({ created_by: req.user!.id }).first();
    if (!broker) return res.json({ registered: false });

    const contributed = await db('customs_coupons').where({ broker_id: broker.id });
    const sentCount = contributed.filter(function(c) { return c.status === 'sent'; }).length;
    const usedCount = contributed.filter(function(c) { return c.status === 'used'; }).length;
    const pendingCount = contributed.filter(function(c) { return c.status === 'issued'; }).length;
    const expiredCount = contributed.filter(function(c) { return c.status === 'expired'; }).length;

    // 按金额统计
    const byDenom = await db('customs_coupons')
      .where({ broker_id: broker.id })
      .select('face_value', 'status')
      .select(db.raw('COUNT(*) as cnt'))
      .groupBy('face_value')
      .groupBy('status')
      .orderBy('face_value', 'asc');

    // 各状态金额汇总
    const sentAmount = await db('customs_coupons').sum('face_value as total').where({ broker_id: broker.id, status: 'sent' }).first();
    const usedAmount = await db('customs_coupons').sum('face_value as total').where({ broker_id: broker.id, status: 'used' }).first();
    const pendingAmount = await db('customs_coupons').sum('face_value as total').where({ broker_id: broker.id, status: 'issued' }).first();
    const expiredAmount = await db('customs_coupons').sum('face_value as total').where({ broker_id: broker.id, status: 'expired' }).first();

    res.json({
      registered: true, companyName: broker.company_name, portName: broker.port_name, portCode: broker.port_code,
      airPorts: broker.air_ports || '', seaPorts: broker.sea_ports || '', importPort: broker.import_port || '',
      contactPerson: broker.contact_person, phone: broker.phone, wechat: broker.wechat, intro: broker.intro,
      feePerDecl: broker.fee_per_decl, commitmentNotes: broker.commitment_notes, serviceType: broker.service_type, canImport: !!broker.can_import,
      exportFee: broker.export_fee, importFee: broker.import_fee,
      totalLaunchd: contributed.length, totalContributed: contributed.length,
      sentCount: sentCount, usedCount: usedCount,
      pendingCount: pendingCount, expiredCount: expiredCount,
      remainingLaunchd: broker.remaining_contributed || 0,
      amountStats: {
        totalAmount: contributed.reduce(function(s, c) { return s + Number(c.face_value || 0); }, 0),
        sentAmount: Number((sentAmount as any)?.total || 0),
        usedAmount: Number((usedAmount as any)?.total || 0),
        pendingAmount: Number((pendingAmount as any)?.total || 0),
        expiredAmount: Number((expiredAmount as any)?.total || 0),
      },
      byDenom: byDenom.map(function(r) { return { faceValue: Number(r.face_value), status: r.status, count: Number(r.cnt) }; }),

      // 最近30天投放记录（按天+运输方式分组）
      recentContributions: await db.raw(`
        SELECT date(created_at) as launch_date, face_value, transport_mode, COUNT(*) as cnt
        FROM customs_coupons
        WHERE broker_id = ? AND created_at >= date('now', '-30 days')
        GROUP BY 1, 2, 3
        ORDER BY 1 DESC, 2 DESC
      `, [broker.id]).then(function(rows) { return (rows as any[]).map(function(r) { return { date: r.launch_date, faceValue: Number(r.face_value), transportMode: r.transport_mode || 'sea', count: Number(r.cnt) }; }) }),
    });
  } catch (err) { logger.error('[broker] stats error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 26. 报关行黄页（公开，按评分/投放量排序）
// ══════════════════════════════════════════════════════════════
router.get('/broker-directory', async (req, res) => {
  try {
    const port = (req.query.port as string || '').trim();
    const mode = (req.query.mode as string || '').trim();
    const sort = (req.query.sort as string || 'rating');
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = db('customs_brokers').where('is_active', true);
    if (port) {
      query = query.where(function () {
        this.where('port_name', 'like', '%' + port + '%')
          .orWhere('air_ports', 'like', '%' + port + '%')
          .orWhere('sea_ports', 'like', '%' + port + '%')
          .orWhere('import_port', 'like', '%' + port + '%')
          .orWhere('port_code', 'like', '%' + port + '%');
      });
    }
    if (mode === 'air') query = query.whereIn('service_type', ['air', 'both']);
    if (mode === 'sea') query = query.whereIn('service_type', ['sea', 'both']);

    const totalQuery = query.clone();
    const total = Number(((await totalQuery.count('* as total').first()) as any)?.total || 0);

    if (sort === 'rating') query = query.orderBy('avg_rating', 'desc').orderBy('review_count', 'desc');
    else if (sort === 'contributed') query = query.orderBy('total_contributed', 'desc');
    else query = query.orderBy('created_at', 'desc');

    const brokers = await query.select(
      'id', 'company_name', 'contact_person', 'phone', 'wechat',
      'port_name', 'port_code', 'service_type', 'can_import',
      'intro', 'fee_per_decl', 'commitment_notes', 'created_by',
      'total_contributed', 'remaining_contributed', 'avg_rating', 'review_count', 'view_count', 'claim_count',
    ).limit(limit).offset(offset);

    res.json({
      data: brokers.map(function(b) { return {
        id: b.id,
        userId: b.created_by, // ← 关联的用户ID，用于站内信联系
        companyName: b.company_name,
        contactPerson: b.contact_person,
        phone: b.phone,
        wechat: b.wechat,
        portName: b.port_name,
        portCode: b.port_code,
        serviceType: b.service_type,
        canImport: !!b.can_import,
        intro: b.intro,
        feePerDecl: b.fee_per_decl ? Number(b.fee_per_decl) : null,
        commitmentNotes: b.commitment_notes,
        totalLaunchd: b.total_contributed || 0,
        remainingLaunchd: b.remaining_contributed || 0,
        avgRating: b.avg_rating ? Number(b.avg_rating) : 0,
        reviewCount: b.review_count || 0,
        viewCount: b.view_count || 0,
        claimCount: b.claim_count || 0,
      }; }),
      total, page, limit,
    });
  } catch (err) { logger.error('[broker] directory error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 27. 提交报关行评价（核销后）
// ══════════════════════════════════════════════════════════════
router.post('/broker-review', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { broker_id, coupon_id, service_rating, efficiency_rating, problem_rating, comment } = req.body;
    if (!broker_id || !service_rating || !efficiency_rating) return res.status(400).json({ error: '请填写评分' });
    if (service_rating < 1 || service_rating > 5 || efficiency_rating < 1 || efficiency_rating > 5) return res.status(400).json({ error: '评分范围1-5' });

    // 检查是否已评价过（同一券）
    if (coupon_id) {
      const existing = await db('broker_reviews').where({ coupon_id, user_id: userId }).first();
      if (existing) return res.status(400).json({ error: '已评价过此券' });
    }

    const reviewId = uuidv4();
    await db('broker_reviews').insert({
      id: reviewId,
      broker_id, user_id: userId, coupon_id: coupon_id || null,
      service_rating, efficiency_rating,
      problem_rating: problem_rating || null,
      comment: comment || null,
      created_at: new Date().toISOString(),
    });

    // 更新报关行平均评分
    const stats = await db('broker_reviews')
      .where({ broker_id })
      .select(db.raw('AVG(service_rating) as avg_s'))
      .select(db.raw('AVG(efficiency_rating) as avg_e'))
      .select(db.raw('COUNT(*) as cnt'))
      .first();

    const avgRating = ((Number((stats as any)?.avg_s || 0) + Number((stats as any)?.avg_e || 0)) / 2).toFixed(1);
    await db('customs_brokers').where({ id: broker_id }).update({
      avg_rating: avgRating,
      review_count: Number((stats as any)?.cnt || 1),
    });

    res.json({ message: '✅ 评价已提交', reviewId });
  } catch (err) { logger.error('[broker] review error:', err); res.status(500).json({ error: '提交失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 28. 获取报关行评价列表
// ══════════════════════════════════════════════════════════════
router.get('/broker/:id/reviews', async (req, res) => {
  try {
    const reviews = await db('broker_reviews')
      .leftJoin('users', 'broker_reviews.user_id', 'users.id')
      .where('broker_reviews.broker_id', req.params.id)
      .select(
        'broker_reviews.*',
        'users.display_name as user_name',
        'users.company_name as user_company',
      )
      .orderBy('broker_reviews.created_at', 'desc')
      .limit(20);

    res.json({ data: reviews.map(function(r) { return {
      id: r.id,
      serviceRating: r.service_rating,
      efficiencyRating: r.efficiency_rating,
      problemRating: r.problem_rating,
      comment: r.comment,
      userName: r.user_name,
      userCompany: r.user_company,
      createdAt: r.created_at,
    }; }) });
  } catch (err) { logger.error('[broker] reviews list error:', err); res.status(500).json({ error: '查询失败' }); }
});
export default router;
