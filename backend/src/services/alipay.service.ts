import fs from 'fs';
import path from 'path';
import { AlipaySdk } from 'alipay-sdk';
import { env } from '../config/env';

let alipayInstance: AlipaySdk | null = null;

function resolveKey(val: string): string {
  if (val.startsWith('file:')) {
    const filePath = path.resolve(process.cwd(), val.slice(5));
    return fs.readFileSync(filePath, 'utf8').trim();
  }
  return val;
}

function getAlipay(): AlipaySdk {
  if (!alipayInstance) {
    if (!env.alipay.appId || !env.alipay.appPrivateKey) {
      throw new Error('支付宝支付未配置');
    }
    alipayInstance = new AlipaySdk({
      appId: env.alipay.appId,
      privateKey: resolveKey(env.alipay.appPrivateKey),
      alipayPublicKey: resolveKey(env.alipay.alipayPublicKey),
    });
  }
  return alipayInstance;
}

export function isAlipayConfigured(): boolean {
  return !!(env.alipay.appId && env.alipay.appPrivateKey);
}

/** 电脑网站支付 - 返回支付宝收银台URL */
export async function createAlipayPagePayUrl(
  outTradeNo: string,
  subject: string,
  totalAmount: number,
  returnUrl: string,
): Promise<string> {
  const alipay = getAlipay();
  const result = await alipay.pageExecute('alipay.trade.page.pay', 'GET', {
    bizContent: {
      out_trade_no: outTradeNo,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: totalAmount.toFixed(2),
      subject,
    },
    returnUrl,
    notifyUrl: env.alipay.notifyUrl,
  });
  let payUrl = typeof result === 'string' ? result : String(result);
  if (payUrl.startsWith('/')) {
    payUrl = `https://openapi.alipay.com/gateway.do${payUrl}`;
  }
  return payUrl;
}

/** 验证支付宝异步通知签名 */
export function verifyAlipayNotify(params: Record<string, any>): boolean {
  try {
    return getAlipay().checkNotifySign(params);
  } catch { return false; }
}

/** 查询交易状态 */
export async function queryAlipayTrade(outTradeNo: string): Promise<any> {
  try {
    return await getAlipay().exec('alipay.trade.query', {
      bizContent: { out_trade_no: outTradeNo },
    });
  } catch { return null; }
}
