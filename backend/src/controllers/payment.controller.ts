import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { env } from '../config/env';
import { isAlipayConfigured, createAlipayPagePayUrl, verifyAlipayNotify, queryAlipayTrade } from '../services/alipay.service';
import { isWechatConfigured, createWechatNativePay, verifyWechatNotify, queryWechatOrder } from '../services/wechat.service';
import { isPaypalConfigured, createPaypalOrder } from '../services/paypal.service';
import logger from '../utils/logger';

async function applyRenewal(order: any) {
  const user = await db('users').where({ id: order.user_id }).first() as any;
  if (!user) return;

  // ── 展会通讯录付费下载（¥10, days=0, plan_id=null） ──
  if (order.days === 0 && !order.plan_id) {
    try {
      const existing = await db('contact_downloads').where({ user_id: user.id, remark: 'directory_full' }).first();
      if (!existing) {
        await db('contact_downloads').insert({
          id: uuidv4(), user_id: user.id,
          amount: order.amount, contact_count: 0, remark: 'directory_full',
          created_at: new Date().toISOString(),
        });
        logger.info(`通讯录付费下载：用户 ${user.username}，金额 ${order.amount}`);
      }
    } catch (e) { logger.error('记录通讯录付费下载失败:', e); }
    return;
  }

  const currentEnd = user.trial_end ? new Date(user.trial_end + 'T23:59:59') : new Date();
  const base = currentEnd > new Date() ? currentEnd : new Date();
  const newEnd = new Date(base.getTime() + order.days * 86400000);

  const planTier = order.amount >= 100 ? 'enterprise' : order.amount >= 39 ? 'pro' : 'standard';

  await db('users').where({ id: user.id }).update({
    trial_end: newEnd.toISOString().split('T')[0],
    status: 'approved',
    plan_tier: planTier,
  });
  await db('renewal_records').insert({
    id: uuidv4(), user_id: user.id, plan_id: order.plan_id,
    days: order.days, amount: order.amount,
    remark: `${order.channel || 'alipay'}支付`, created_by: user.id,
    created_at: new Date().toISOString(),
  });

  if (user.role === 'forwarder') {
    const existingSub = await db('monthly_subscriptions').where({ user_id: user.id, status: 'active' }).first();
    if (!existingSub) {
      const month = new Date().toISOString().slice(0, 7);
      const subId = uuidv4();
      await db('monthly_subscriptions').insert({
        id: subId, user_id: user.id, status: 'active',
        current_month: month, amount: 19.90, last_paid_at: new Date().toISOString(),
      });
      await db('customs_coupons').insert({
        id: uuidv4(), subscription_id: subId, forwarder_id: user.id,
        face_value: 50.00, month, status: 'issued', created_at: new Date().toISOString(),
      });
    }
  }
  logger.info(`续期成功：用户 ${user.username}，${order.days}天，金额 ${order.amount}`);
}

/** 处理微信支付异步通知（XML） */
async function handleWechatNotify(req: Request, res: Response) {
  try {
    const rawBody = (req as any).rawBody || '';
    if (!rawBody) {
      logger.warn('微信通知：rawBody 为空');
      return res.status(200).send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[Empty body]]></return_msg></xml>');
    }

    const msg = await verifyWechatNotify(rawBody);
    if (!msg) {
      logger.warn('微信通知：签名验证失败');
      return res.status(200).send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[Sign verify failed]]></return_msg></xml>');
    }

    const outTradeNo = msg.out_trade_no as string;
    if (msg.result_code === 'SUCCESS' && msg.return_code === 'SUCCESS') {
      // 检查订阅支付订单
      const order = await db('payment_orders').where({ remark: outTradeNo, status: 'pending' }).first() as any;
      if (order) {
        await db('payment_orders').where({ id: order.id }).update({
          status: 'paid',
          pay_trade_no: (msg.transaction_id as string) || '',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        await applyRenewal(order);
        logger.info(`微信支付成功：订单 ${outTradeNo}，交易号 ${msg.transaction_id}`);
        return;
      }

      // 检查紧急推广订单
      const promoOrder = await db('bulk_promote_orders').where({ id: outTradeNo, status: 'pending' }).first() as any;
      if (promoOrder) {
        const { cargoController } = await import('./cargo.controller');
        await cargoController.bulkPromoteCallback(outTradeNo);
        logger.info(`紧急推广支付成功：订单 ${outTradeNo}`);
        return;
      }
    }
    return res.status(200).send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>');
  } catch (err: any) {
    logger.error('微信通知处理异常:', err.message);
    return res.status(200).send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[Server error]]></return_msg></xml>');
  }
}

export const paymentController = {
  async plans(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('membership_plans').where({ is_active: true }).orderBy('days', 'asc');
      res.json({
        data,
        alipay_configured: isAlipayConfigured(),
        wechat_configured: isWechatConfigured(),
        paypal_configured: isPaypalConfigured(),
      });
    } catch (err) { next(err); }
  },

  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { plan_id, channel } = req.body;
      const payChannel: string = channel || 'wechat';
      if (!plan_id) return res.status(400).json({ error: '请选择套餐' });

      if (payChannel === 'alipay' && !isAlipayConfigured()) {
        return res.status(503).json({ error: '支付宝尚未配置' });
      }
      if (payChannel === 'wechat' && !isWechatConfigured()) {
        return res.status(503).json({ error: '微信支付尚未配置' });
      }
      if (payChannel === 'paypal' && !isPaypalConfigured()) {
        return res.status(503).json({ error: 'PayPal 尚未配置' });
      }

      const plan = await db('membership_plans').where({ id: plan_id, is_active: true }).first();
      if (!plan) return res.status(404).json({ error: '套餐不存在或已停用' });

      const userId = req.user!.id;
      const orderId = uuidv4();
      const outTradeNo = `PAY${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const subject = `${(plan as any).name} · 123物流社区会员`;
      const price = Number((plan as any).price);

      await db('payment_orders').insert({
        id: orderId, user_id: userId, plan_id,
        amount: price, days: (plan as any).days,
        status: 'pending', channel: payChannel, remark: outTradeNo,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });

      if (payChannel === 'wechat') {
        // ── 微信官方扫码支付（Native）→ 返回二维码URL ──
        const result = await createWechatNativePay(outTradeNo, price, subject);

        res.json({
          order_id: orderId, trade_no: outTradeNo,
          pay_method: 'qrcode', pay_content: result.codeUrl,
          channel: 'wechat', amount: price, subject,
        });
      } else if (payChannel === 'paypal') {
        // ── PayPal → 返回跳转URL ──
        const result = await createPaypalOrder(outTradeNo, price, subject);

        res.json({
          order_id: orderId, trade_no: outTradeNo,
          pay_method: 'redirect', pay_content: result.approvalUrl,
          channel: 'paypal', amount: price, subject,
        });
      } else {
        // ── 支付宝 → 返回收银台URL ──
        const returnUrl = `${env.frontendUrl}/admin/renew?order_id=${orderId}`;
        const payUrl = await createAlipayPagePayUrl(outTradeNo, subject, price, returnUrl);

        res.json({
          order_id: orderId, trade_no: outTradeNo,
          pay_method: 'redirect', pay_content: payUrl,
          channel: 'alipay', amount: price, subject,
        });
      }
    } catch (err: any) {
      logger.error('创建支付订单失败:', err.message || err, err.stack || '');
      res.status(500).json({ error: `支付创建失败: ${err.message || '请稍后重试'}` });
    }
  },

  async notify(req: Request, res: Response) {
    try {
      // 微信支付通知：XML body，有 return_code 字段
      const rawBody = (req as any).rawBody || '';
      const params = req.body;
      if (!params || Object.keys(params).length === 0) {
        // 可能是微信 XML 通知
        if (rawBody.includes('<xml>') || rawBody.includes('return_code')) {
          return handleWechatNotify(req, res);
        }
        return res.status(400).send('fail');
      }

      // 检测是否为微信支付通知（XML 解析后会有 return_code/appid）
      if (params.return_code || params.appid) {
        return handleWechatNotify(req, res);
      }

      // 支付宝通知：form-urlencoded JSON
      if (!verifyAlipayNotify(params)) return res.status(200).send('fail');

      if (params.trade_status === 'TRADE_SUCCESS' || params.trade_status === 'TRADE_FINISHED') {
        const order = await db('payment_orders').where({ remark: params.out_trade_no, status: 'pending' }).first() as any;
        if (order) {
          await db('payment_orders').where({ id: order.id }).update({
            status: 'paid', pay_trade_no: params.trade_no, paid_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          });
          await applyRenewal(order);
        }
      }
      return res.status(200).send('success');
    } catch { return res.status(200).send('fail'); }
  },

  async queryOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      const userId = req.user!.id;
      const order = await db('payment_orders').where({ id: orderId, user_id: userId }).first() as any;
      if (!order) return res.status(404).json({ error: '订单不存在' });
      if (order.status === 'pending' && order.remark) {
        if (order.channel === 'wechat') {
          const result = await queryWechatOrder(order.remark);
          if (result?.tradeStatus === 'SUCCESS') {
            await db('payment_orders').where({ id: orderId }).update({
              status: 'paid', pay_trade_no: result.tradeNo, paid_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            });
            await applyRenewal(order);
            order.status = 'paid';
          }
        } else {
          const tradeResult = await queryAlipayTrade(order.remark);
          if (tradeResult?.alipay_trade_query_response?.trade_status === 'TRADE_SUCCESS') {
            await db('payment_orders').where({ id: orderId }).update({
              status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            });
            await applyRenewal(order);
            order.status = 'paid';
          }
        }
      }
      res.json(order);
    } catch (err) { next(err); }
  },

  async myOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('payment_orders')
        .where({ user_id: req.user!.id })
        .leftJoin('membership_plans', 'payment_orders.plan_id', 'membership_plans.id')
        .select('payment_orders.*', 'membership_plans.name as plan_name')
        .orderBy('payment_orders.created_at', 'desc')
        .limit(20);
      res.json({ data });
    } catch (err) { next(err); }
  },
};
