import { AlipaySdk } from 'alipay-sdk';
import { env } from '../config/env';

let alipayInstance: AlipaySdk | null = null;

/** 获取 Alipay SDK 单例（仅在配置就绪时可用） */
export function getAlipay(): AlipaySdk {
  if (!alipayInstance) {
    if (!env.alipay.appId || !env.alipay.appPrivateKey) {
      throw new Error('支付宝支付未配置（ALIPAY_APP_ID / ALIPAY_APP_PRIVATE_KEY）');
    }
    alipayInstance = new AlipaySdk({
      appId: env.alipay.appId,
      privateKey: env.alipay.appPrivateKey,
      alipayPublicKey: env.alipay.alipayPublicKey,
    });
  }
  return alipayInstance;
}

/** 检查支付宝是否已配置 */
export function isAlipayConfigured(): boolean {
  return !!(env.alipay.appId && env.alipay.appPrivateKey);
}

/**
 * 创建电脑网站支付订单，返回支付页面 URL
 */
export async function createPagePayUrl(
  outTradeNo: string,
  subject: string,
  totalAmount: number,
  returnUrl: string,
): Promise<string> {
  const alipay = getAlipay();
  const bizContent = {
    out_trade_no: outTradeNo,
    product_code: 'FAST_INSTANT_TRADE_PAY',
    total_amount: totalAmount.toFixed(2),
    subject,
  };

  const result = await alipay.pageExecute('alipay.trade.page.pay', 'GET', {
    bizContent,
    returnUrl,
    notifyUrl: env.alipay.notifyUrl,
  });

  return `${env.alipay.notifyUrl.split('/api/payment/notify')[0]}${result}`;
}

/**
 * 验证支付宝异步通知签名
 */
export function verifyNotify(params: Record<string, any>): boolean {
  try {
    const alipay = getAlipay();
    return alipay.checkNotifySign(params);
  } catch {
    return false;
  }
}

/**
 * 查询交易状态
 */
export async function queryTrade(outTradeNo: string): Promise<any> {
  try {
    const alipay = getAlipay();
    const result = await alipay.exec('alipay.trade.query', {
      bizContent: { out_trade_no: outTradeNo },
    });
    return result;
  } catch {
    return null;
  }
}
