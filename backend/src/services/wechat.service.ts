import tenpay from 'tenpay';
import { env } from '../config/env';
import logger from '../utils/logger';

let wechatInstance: tenpay | null = null;

function getWechat(): tenpay {
  if (!wechatInstance) {
    if (!env.wechat.appId || !env.wechat.mchId || !env.wechat.apiKey) {
      throw new Error('微信支付未配置');
    }
    wechatInstance = new tenpay({
      appid: env.wechat.appId,
      mchid: env.wechat.mchId,
      partnerKey: env.wechat.apiKey,
      notify_url: env.wechat.notifyUrl,
      spbill_create_ip: '123.123.123.123',
    });
  }
  return wechatInstance;
}

export function isWechatConfigured(): boolean {
  return !!(env.wechat.appId && env.wechat.mchId && env.wechat.apiKey);
}

/** Native 扫码支付：调用统一下单API，返回二维码内容（code_url） */
export async function createWechatNativePay(
  outTradeNo: string,
  totalFee: number,    // 单位：元
  subject: string,
): Promise<{ codeUrl: string }> {
  try {
    const wx = getWechat();
    const result = await wx.unifiedOrder({
      out_trade_no: outTradeNo,
      body: subject,
      total_fee: Math.round(totalFee * 100), // 转分为单位
      trade_type: 'NATIVE',
    });
    if (!result || result.return_code !== 'SUCCESS' || result.result_code !== 'SUCCESS') {
      throw new Error(result?.return_msg || '微信统一下单失败');
    }
    const codeUrl = (result as any).code_url || '';
    if (!codeUrl) throw new Error('微信未返回二维码');
    return { codeUrl };
  } catch (err: any) {
    logger.error('微信支付统一下单失败:', err.message);
    throw err;
  }
}

/** 验证微信异步通知签名，返回解析后的通知数据 */
export async function verifyWechatNotify(xmlBody: string): Promise<Record<string, any> | null> {
  try {
    const wx = getWechat();
    // tenpay's middleware expects xml string
    const result = await new Promise<Record<string, any>>((resolve, reject) => {
      const middleware = wx.middleware((msg: any, req: any) => {
        resolve(msg);
      });
      const fakeReq = { body: xmlBody, headers: { 'content-type': 'text/xml' } };
      const fakeRes = { end: () => {} };
      middleware(fakeReq, fakeRes, (err: any) => {
        if (err) reject(err);
      });
    });
    return result;
  } catch (err: any) {
    logger.error('微信支付通知验证失败:', err.message);
    return null;
  }
}

/** 查询订单状态 */
export async function queryWechatOrder(outTradeNo: string): Promise<{
  tradeStatus: string; // SUCCESS / NOTPAY / etc
  tradeNo?: string;
} | null> {
  try {
    const wx = getWechat();
    const result = await wx.orderQuery({ out_trade_no: outTradeNo });
    if (!result) return null;

    const tradeState = (result as any).trade_state || '';
    const transactionId = (result as any).transaction_id || '';
    return {
      tradeStatus: tradeState === 'SUCCESS' ? 'SUCCESS' : tradeState,
      tradeNo: transactionId || undefined,
    };
  } catch (err: any) {
    logger.error('微信支付查询失败:', err.message);
    return null;
  }
}

/** Express 中间件：处理微信异步通知（备选方案，用于独立路由） */
export function wechatNotifyMiddleware() {
  const wx = getWechat();
  return wx.middleware((msg: any, _req: any, res: any) => {
    // msg 已经过 tenpay 验证签名
    return msg;
  });
}
