import { env } from '../config/env';
import logger from '../utils/logger';

// PayPal API base URL
const PAYPAL_API = env.paypal.sandbox
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

export function isPaypalConfigured(): boolean {
  return !!(env.paypal.clientId && env.paypal.clientSecret);
}

/** 获取 PayPal Access Token */
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${env.paypal.clientId}:${env.paypal.clientSecret}`).toString('base64');
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json() as any;
  return data.access_token;
}

/** 创建 PayPal 订单（用于扫码/跳转支付） */
export async function createPaypalOrder(
  orderId: string,
  amount: number,
  description: string,
): Promise<{ orderId: string; approvalUrl: string }> {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: orderId,
        amount: { currency_code: 'USD', value: amount.toFixed(2) },
        description,
      }],
      application_context: {
        return_url: `${env.frontendUrl}/admin/subscribe?paypal=success`,
        cancel_url: `${env.frontendUrl}/admin/subscribe?paypal=cancel`,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    logger.error(`PayPal order creation failed: ${err}`);
    throw new Error('PayPal order creation failed');
  }
  const data = await res.json() as any;
  const approvalUrl = data.links?.find((l: any) => l.rel === 'approve')?.href || '';
  return { orderId: data.id, approvalUrl };
}

/** 捕获 PayPal 支付（确认收款） */
export async function capturePaypalOrder(paypalOrderId: string): Promise<{ status: string; paidAt: string }> {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const err = await res.text();
    logger.error(`PayPal capture failed: ${err}`);
    throw new Error('PayPal capture failed');
  }
  const data = await res.json() as any;
  return { status: data.status, paidAt: data.update_time || new Date().toISOString() };
}
