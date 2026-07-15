import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authRequired } from '../middleware/auth.middleware';
import db from '../config/database';
import logger from '../utils/logger';

const router = Router();
router.use(authRequired);

const CURRENT_MONTH = new Date().toISOString().slice(0, 7); // YYYY-MM

// ══════════════════════════════════════════════════════════════
// 通用：获取当前月份字符串
// ══════════════════════════════════════════════════════════════
function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

// ══════════════════════════════════════════════════════════════
// 1. 订阅状态查询
// ══════════════════════════════════════════════════════════════
router.get('/my-subscription', async (req, res) => {
  try {
    const sub = await db('monthly_subscriptions')
      .where({ user_id: req.user!.id })
      .orderBy('created_at', 'desc')
      .first();
    if (!sub) return res.json({ subscribed: false });
    res.json({
      subscribed: sub.status === 'active',
      status: sub.status,
      currentMonth: sub.current_month,
      since: sub.created_at,
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
    await db('monthly_subscriptions').insert({
      id: subId,
      user_id: req.user!.id,
      status: 'active',
      current_month: month,
      amount: 19.90,
      last_paid_at: new Date().toISOString(),
    });

    // 生成当月券
    const couponId = uuidv4();
    await db('customs_coupons').insert({
      id: couponId,
      subscription_id: subId,
      forwarder_id: req.user!.id,
      face_value: 50.00,
      month,
      status: 'issued',
    });

    res.json({ message: '✅ 月费订阅已开通，本月报关券已生成', couponId });
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
// 4. 外贸活跃用户列表（供货代选择送券）
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
// 5. 送券给指定外贸用户
// ══════════════════════════════════════════════════════════════
router.post('/send', async (req, res) => {
  try {
    const { traderId } = req.body;
    if (!traderId) return res.status(400).json({ error: '请选择接收用户' });

    // 检查外贸用户是否存在
    const trader = await db('users').where({ id: traderId, role: 'trader' }).first();
    if (!trader) return res.status(404).json({ error: '外贸用户不存在' });

    // 获取当前用户未送出的当月券
    const month = getCurrentMonth();
    const coupon = await db('customs_coupons')
      .where({ forwarder_id: req.user!.id, month, status: 'issued' })
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

    // 送券
    await db('customs_coupons').where({ id: coupon.id }).update({
      trader_id: traderId,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    // 给外贸发送站内信通知
    const forwarder = await db('users').where({ id: req.user!.id }).first() as any;
    await db('messages').insert({
      id: uuidv4(),
      sender_id: req.user!.id,
      receiver_id: traderId,
      content: `🎫 ${forwarder.display_name || '一位货代'} 赠送您一张50元报关券！\n可在「我的券包」中查看和使用。`,
      created_at: new Date().toISOString(),
    });

    res.json({ message: `✅ 已赠送报关券给 ${trader.display_name || trader.company_name || ''}` });
  } catch (err) { logger.error('[coupon] send error:', err); res.status(500).json({ error: '赠送失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 6. 我的券列表（货代视角/外贸视角）
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
      // 货代视角：送出的券
      const query = db('customs_coupons')
        .leftJoin('users as tr', 'customs_coupons.trader_id', 'tr.id')
        .where('customs_coupons.forwarder_id', req.user!.id)
        .select(
          'customs_coupons.*',
          'tr.display_name as trader_name',
          'tr.company_name as trader_company',
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
    const orders = await db('coupon_usage_records as cur')
      .leftJoin('customs_coupons as cc', 'cur.coupon_id', 'cc.id')
      .leftJoin('users as tr', 'cur.trader_id', 'tr.id')
      .where('cur.status', 'pending')
      .select(
        'cur.id',
        'cur.status',
        'cur.decl_info',
        'cur.created_at',
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

    const record = await db('coupon_usage_records').where({ id: usageId, status: 'pending' }).first();
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
router.get('/admin/brokers', async (req, res) => {
  try {
    const brokers = await db('customs_brokers').orderBy('created_at', 'desc');
    res.json({ data: brokers });
  } catch (err) { logger.error('[coupon] admin brokers error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 12. 管理员：新增/编辑报关行
// ══════════════════════════════════════════════════════════════
router.post('/admin/brokers', async (req, res) => {
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
router.get('/admin/stats', async (req, res) => {
  try {
    const [issuedCount, sentCount, usedCount, pendingOrders, completedOrders] = await Promise.all([
      db('customs_coupons').count('* as total').first(),
      db('customs_coupons').where({ status: 'sent' }).count('* as total').first(),
      db('customs_coupons').where({ status: 'used' }).count('* as total').first(),
      db('coupon_usage_records').where({ status: 'pending' }).count('* as total').first(),
      db('coupon_usage_records').where({ status: 'completed' }).count('* as total').first(),
    ]);

    // 本月统计数据
    const month = new Date().toISOString().slice(0, 7);
    const [subCount, monthUsed] = await Promise.all([
      db('monthly_subscriptions').where({ status: 'active' }).count('* as total').first(),
      db('customs_coupons').where({ month, status: 'used' }).count('* as total').first(),
    ]);

    res.json({
      totalIssued: Number((issuedCount as any)?.total || 0),
      totalSent: Number((sentCount as any)?.total || 0),
      totalUsed: Number((usedCount as any)?.total || 0),
      pendingOrders: Number((pendingOrders as any)?.total || 0),
      completedOrders: Number((completedOrders as any)?.total || 0),
      activeSubscriptions: Number((subCount as any)?.total || 0),
      monthUsed: Number((monthUsed as any)?.total || 0),
    });
  } catch (err) { logger.error('[coupon] admin stats error:', err); res.status(500).json({ error: '查询失败' }); }
});

// ══════════════════════════════════════════════════════════════
// 14. 管理员：周结确认
// ══════════════════════════════════════════════════════════════
router.post('/admin/settlement', async (req, res) => {
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
    const prevMonth = new Date();
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const monthStr = prevMonth.toISOString().slice(0, 7); // 上个月

    const subs = await db('monthly_subscriptions')
      .where({ status: 'active' })
      .where('current_month', '<', monthStr)
      .select('*');

    let issued = 0;
    for (const sub of subs) {
      const thisMonth = new Date().toISOString().slice(0, 7);
      // 检查本月是否已发
      const exists = await db('customs_coupons')
        .where({ subscription_id: sub.id, month: thisMonth }).first();
      if (exists) continue;

      await db('customs_coupons').insert({
        id: uuidv4(),
        subscription_id: sub.id,
        forwarder_id: sub.user_id,
        face_value: 50.00,
        month: thisMonth,
        status: 'issued',
      });
      // 更新订阅的当前月份
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

export default router;
