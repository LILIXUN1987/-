import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { env } from '../config/env';
import { isAlipayConfigured, createPagePayUrl, verifyNotify, queryTrade } from '../services/alipay.service';
import logger from '../utils/logger';

export const paymentController = {
  // ── 获取套餐列表 ──
  async plans(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('membership_plans').where({ is_active: true }).orderBy('days', 'asc');
      res.json({ data, alipay_configured: isAlipayConfigured() });
    } catch (err) { next(err); }
  },

  // ── 创建支付订单 ──
  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { plan_id } = req.body;
      if (!plan_id) return res.status(400).json({ error: '请选择套餐' });
      if (!isAlipayConfigured()) return res.status(503).json({ error: '支付系统尚未配置' });

      const plan = await db('membership_plans').where({ id: plan_id, is_active: true }).first();
      if (!plan) return res.status(404).json({ error: '套餐不存在或已停用' });

      const userId = req.user!.id;
      const orderId = uuidv4();
      const outTradeNo = `PAY${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // 查询用户信息
      const user = await db('users').where({ id: userId }).first() as any;
      const userName = user?.display_name || user?.username || '用户';
      const subject = `${(plan as any).name} · 123物流社区会员续费`;

      await db('payment_orders').insert({
        id: orderId,
        user_id: userId,
        plan_id,
        amount: (plan as any).price,
        days: (plan as any).days,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 生成支付宝支付链接
      const returnUrl = `${env.frontendUrl}/admin/renew?order_id=${orderId}`;
      const payUrl = await createPagePayUrl(outTradeNo, subject, (plan as any).price, returnUrl);

      // 保存支付宝商户订单号
      await db('payment_orders').where({ id: orderId }).update({ remark: outTradeNo });

      res.json({
        order_id: orderId,
        trade_no: outTradeNo,
        pay_url: payUrl,
        amount: (plan as any).price,
        subject,
      });
    } catch (err) {
      logger.error('创建支付订单失败:', err);
      next(err);
    }
  },

  // ── 支付宝异步通知 ──
  async notify(req: Request, res: Response, _next: NextFunction) {
    try {
      const params = req.body; // POST form-encoded
      if (!params || Object.keys(params).length === 0) {
        // Alipay 可能发 JSON body
        return res.status(400).send('fail');
      }

      const verified = verifyNotify(params);
      if (!verified) {
        logger.warn('支付宝异步通知签名验证失败');
        return res.status(200).send('fail');
      }

      const outTradeNo = params.out_trade_no;
      const tradeStatus = params.trade_status;

      if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
        // 查找订单
        const order = await db('payment_orders').where({ remark: outTradeNo, status: 'pending' }).first();
        if (order) {
          const now = new Date().toISOString();
          // 更新订单状态
          await db('payment_orders').where({ id: (order as any).id }).update({
            status: 'paid',
            alipay_trade_no: params.trade_no,
            alipay_buyer_id: params.buyer_id,
            paid_at: now,
            updated_at: now,
          });

          // 为用户续期
          const user = await db('users').where({ id: (order as any).user_id }).first() as any;
          if (user) {
            const currentEnd = user.trial_end ? new Date(user.trial_end + 'T23:59:59') : new Date();
            const nowDate = new Date();
            // 如果已过期，从今天算；否则从到期日算
            const base = currentEnd > nowDate ? currentEnd : nowDate;
            const newEnd = new Date(base.getTime() + (order as any).days * 86400000);

            await db('users').where({ id: user.id }).update({
              trial_end: newEnd.toISOString().split('T')[0],
              status: 'approved',
            });

            // 记录续期记录
            await db('renewal_records').insert({
              id: uuidv4(),
              user_id: user.id,
              plan_id: (order as any).plan_id,
              days: (order as any).days,
              amount: (order as any).amount,
              remark: `支付宝自助续期`,
              created_by: user.id,
              created_at: now,
            });

            logger.info(`支付宝支付成功：用户 ${user.username}，订单 ${outTradeNo}，金额 ${(order as any).amount}`);
          }
        }
      }

      // 必须返回 "success"（小写）告诉支付宝不再通知
      res.status(200).send('success');
    } catch (err) {
      logger.error('支付宝异步通知处理失败:', err);
      res.status(200).send('fail');
    }
  },

  // ── 查询订单状态 ──
  async queryOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      const userId = req.user!.id;

      const order = await db('payment_orders').where({ id: orderId, user_id: userId }).first();
      if (!order) return res.status(404).json({ error: '订单不存在' });

      // 如果还处于 pending 状态，尝试向支付宝查询
      if ((order as any).status === 'pending' && (order as any).remark) {
        const tradeResult = await queryTrade((order as any).remark);
        if (tradeResult && tradeResult.trade_status === 'TRADE_SUCCESS') {
          // 支付宝告知已支付但通知还没到 → 手动同步
          const now = new Date().toISOString();
          await db('payment_orders').where({ id: orderId }).update({
            status: 'paid',
            alipay_trade_no: tradeResult.trade_no,
            alipay_buyer_id: tradeResult.buyer_id,
            paid_at: now,
            updated_at: now,
          });

          // 续期
          const user = await db('users').where({ id: userId }).first() as any;
          if (user) {
            const currentEnd = user.trial_end ? new Date(user.trial_end + 'T23:59:59') : new Date();
            const base = currentEnd > new Date() ? currentEnd : new Date();
            const newEnd = new Date(base.getTime() + (order as any).days * 86400000);
            await db('users').where({ id: user.id }).update({
              trial_end: newEnd.toISOString().split('T')[0],
              status: 'approved',
            });
            await db('renewal_records').insert({
              id: uuidv4(), user_id: user.id, plan_id: (order as any).plan_id,
              days: (order as any).days, amount: (order as any).amount,
              remark: '支付宝支付（同步查询）', created_by: userId, created_at: now,
            });
          }

          (order as any).status = 'paid';
        }
      }

      res.json(order);
    } catch (err) { next(err); }
  },

  // ── 当前用户的支付记录 ──
  async myOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('payment_orders')
        .where({ user_id: req.user!.id })
        .leftJoin('membership_plans', 'payment_orders.plan_id', 'membership_plans.id')
        .select(
          'payment_orders.*',
          'membership_plans.name as plan_name',
        )
        .orderBy('payment_orders.created_at', 'desc')
        .limit(20);
      res.json({ data });
    } catch (err) { next(err); }
  },
};
