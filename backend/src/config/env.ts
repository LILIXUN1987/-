import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

// 生产环境强制要求关键配置（缺一不可，启动即报错）
function required(key: string): string {
  if (!process.env[key]) {
    throw new Error(`❌ 缺少必需环境变量: ${key} （生产环境必须设置）`);
  }
  return process.env[key]!;
}
// 只有生产环境才强制
function prodRequired(key: string): string {
  if (isProd && !process.env[key]) {
    throw new Error(`❌ 生产环境必须设置环境变量: ${key}`);
  }
  return process.env[key] || '';
}

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv,

  // Database
  database: {
    client: (process.env.DATABASE_CLIENT || 'sqlite3') as 'pg' | 'sqlite3',
    host: process.env.DATABASE_HOST || (isProd ? required('DATABASE_HOST') : 'localhost'),
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    name: process.env.DATABASE_NAME || (isProd ? required('DATABASE_NAME') : 'logistics'),
    user: process.env.DATABASE_USER || (isProd ? required('DATABASE_USER') : 'postgres'),
    password: isProd ? required('DATABASE_PASSWORD') : (process.env.DATABASE_PASSWORD || ''),
  },

  // JWT — 生产环境必须由运维生成强随机密钥
  jwt: {
    secret: isProd ? required('JWT_SECRET') : (process.env.JWT_SECRET || 'dev-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // AI Provider: 'deepseek' or 'claude'
  aiProvider: (process.env.AI_PROVIDER || 'deepseek') as 'deepseek' | 'claude',

  // DeepSeek — 生产环境必填
  deepseekApiKey: prodRequired('DEEPSEEK_API_KEY'),
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',

  // Anthropic
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // Upload
  upload: {
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '20', 10),
    dir: process.env.UPLOAD_DIR || './uploads',
  },

  // Frontend — 生产环境必填（CORS）
  frontendUrl: prodRequired('FRONTEND_URL'),

  // SMTP — 生产环境必填
  smtp: {
    host: prodRequired('SMTP_HOST'),
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE !== 'false',
    user: prodRequired('SMTP_USER'),
    pass: prodRequired('SMTP_PASS'),
    fromName: process.env.SMTP_FROM_NAME || '123共享外贸物流社区',
  },

  // Tencent Cloud OCR
  tencentOcr: {
    secretId: process.env.TENCENT_OCR_SECRET_ID || '',
    secretKey: process.env.TENCENT_OCR_SECRET_KEY || '',
  },

  // 支付宝
  alipay: {
    appId: process.env.ALIPAY_APP_ID || '',
    appPrivateKey: process.env.ALIPAY_APP_PRIVATE_KEY || '',
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'https://123cargo123.com/api/payment/notify',
  },

  // 微信支付
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    mchId: process.env.WECHAT_MCH_ID || '',
    apiKey: process.env.WECHAT_API_KEY || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
    notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://123cargo123.com/api/payment/notify',
  },

  // PayPal — 海外代理订阅支付
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    sandbox: process.env.PAYPAL_SANDBOX === 'true',
  },

  // Web Push (VAPID) — 生产环境必填
  vapid: {
    publicKey: prodRequired('VAPID_PUBLIC_KEY'),
    privateKey: prodRequired('VAPID_PRIVATE_KEY'),
    subject: process.env.VAPID_SUBJECT || 'mailto:support@tiangaocargo.com',
  },
};
