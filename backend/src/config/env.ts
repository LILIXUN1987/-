import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

// 生产环境强制要求关键配置
function required(key: string): string {
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

  // JWT
  jwt: {
    secret: isProd ? required('JWT_SECRET') : (process.env.JWT_SECRET || 'dev-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // AI Provider: 'deepseek' or 'claude'
  aiProvider: (process.env.AI_PROVIDER || 'deepseek') as 'deepseek' | 'claude',

  // DeepSeek (OpenAI compatible)
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',

  // Anthropic (legacy, still supported)
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // Upload
  upload: {
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '20', 10),
    dir: process.env.UPLOAD_DIR || './uploads',
  },

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // SMTP / Email
  smtp: {
    host: process.env.SMTP_HOST || (isProd ? required('SMTP_HOST') : 'smtp.qiye.aliyun.com'),
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER || (isProd ? required('SMTP_USER') : 'support@tiangaocargo.com'),
    pass: isProd ? required('SMTP_PASS') : (process.env.SMTP_PASS || ''),
    fromName: process.env.SMTP_FROM_NAME || '123共享外贸物流社区',
  },

  // Tencent Cloud OCR
  tencentOcr: {
    secretId: process.env.TENCENT_OCR_SECRET_ID || '',
    secretKey: process.env.TENCENT_OCR_SECRET_KEY || '',
  },

  // Alipay
  alipay: {
    appId: process.env.ALIPAY_APP_ID || '',
    appPrivateKey: process.env.ALIPAY_APP_PRIVATE_KEY || '',
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'https://123cargo123.com/api/payment/notify',
  },
};
