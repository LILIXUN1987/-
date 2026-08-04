import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rateLimit.middleware';
import db from './config/database';
import authRoutes from './routes/auth.routes';
import filesRoutes from './routes/files.routes';
import cargoRoutes from './routes/cargo.routes';
import registerRoutes from './routes/register.routes';
import complaintsRoutes from './routes/complaints.routes';
import suggestionsRoutes from './routes/suggestions.routes';
import messagesRoutes from './routes/messages.routes';
import riskAlertRoutes from './routes/riskalert.routes';
import favoritesRoutes from './routes/favorites.routes';
import adminRoutes from './routes/admin.routes';
import expressInquiryRoutes from './routes/expressInquiry.routes';
import rawMessagesRoutes from './routes/rawMessages.routes';
import lawyersRoutes from './routes/lawyers.routes';
import dgRoutes from './routes/dg.routes';
import pushRoutes from './routes/push.routes';
import auditRoutes from './routes/audit.routes';
import activityRoutes from './routes/activity.routes';
import reviewsRoutes from './routes/reviews.routes';
import paymentRoutes from './routes/payment.routes';
import toolsRoutes from './routes/tools.routes';
import cardsRoutes from './routes/cards.routes';
import quoteRoutes from './routes/quote.routes';
import ddpRoutes from './routes/ddp.routes';
import cooperationRoutes from './routes/cooperation.routes';
import disputeRoutes from './routes/dispute.routes';
import navRoutes from './routes/nav.routes';
import portServicesRoutes from './routes/portServices.routes';
import customsCouponRoutes from './routes/customsCoupon.routes';
import overseasRoutes from './routes/overseas.routes';
import dashboardRoutes from './routes/dashboard.routes';
import apiKeyRoutes from './routes/apiKey.routes';
import aiAskRoutes from './routes/aiAsk.routes';
import planRoutes from './routes/plan.routes';
import directoryRoutes from './routes/directory.routes';
import consigneeRoutes from './routes/consignees.routes';

const app = express();

// 信任 Nginx 反代，获取真实客户端 IP
app.set('trust proxy', 1);

// ── Global Middleware ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'same-origin' },
}));
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
}));
// 请求日志：开发环境详细，生产环境精简
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
// 限制请求体大小 + 保存 rawBody（微信支付 XML 通知用）
app.use((req: any, _res, next) => {
  if (req.headers['content-type']?.includes('xml')) {
    let data = '';
    req.on('data', (chunk: string) => data += chunk);
    req.on('end', () => { req.rawBody = data; next(); });
  } else {
    next();
  }
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
// 全局 API 限流（200次/分钟/IP）
app.use('/api', apiLimiter);


// ── Health Check（依次检测数据库、SMTP、AI） ──
app.get('/api/health', async (_req, res) => {
  const checks: Record<string, { status: string; error?: string }> = {};

  // 1. 数据库
  try {
    await db.raw('SELECT 1');
    checks.db = { status: 'ok' };
  } catch (e: any) {
    checks.db = { status: 'error', error: e.message };
  }

  // 2. SMTP
  try {
    const { getTransporter } = await import('./services/email.service');
    const t = getTransporter();
    if (t && env.smtp.pass) {
      await t.verify();
      checks.smtp = { status: 'ok' };
    } else {
      checks.smtp = { status: 'skipped', error: 'SMTP_PASS not configured' };
    }
  } catch (e: any) {
    checks.smtp = { status: 'error', error: e.message };
  }

  // 3. AI (DeepSeek) — 简单的连通性检查
  try {
    if (env.deepseekApiKey) {
      checks.ai = { status: 'configured' };
    } else {
      checks.ai = { status: 'skipped', error: 'DEEPSEEK_API_KEY not set' };
    }
  } catch (e: any) {
    checks.ai = { status: 'error', error: e.message };
  }

  const allOk = Object.values(checks).every(c => c.status !== 'error');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// ── 公开路由（二维码、动态流等） ──
app.use('/api', activityRoutes);

// ── 文件服务（名片/营业执照图片通过img标签加载，浏览器不带Authorization头） ──
// 文件名为UUID，无法被枚举猜测
app.get('/api/uploads/*', (req, res) => {
  // 提取文件路径（去掉 /api/uploads/ 前缀）
  const prefix = '/api/uploads/';
  const fileRelPath = req.path.substring(prefix.length);
  if (!fileRelPath || fileRelPath.includes('..') || fileRelPath.includes(':') || path.isAbsolute(fileRelPath)) {
    return res.status(400).json({ error: '非法路径' });
  }
  const fullPath = path.resolve(env.upload.dir, fileRelPath);
  // 确保文件在 upload 目录内（防止路径穿越）
  if (!fullPath.startsWith(path.resolve(env.upload.dir))) {
    return res.status(403).json({ error: '禁止访问' });
  }
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: '文件不存在' });
  }
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.sendFile(fullPath);
});

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/cargo-spaces', cargoRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/risk-alerts', riskAlertRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/express-inquiry', expressInquiryRoutes);
app.use('/api/raw-messages', rawMessagesRoutes);
app.use('/api/lawyers', lawyersRoutes);
app.use('/api/dg', dgRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/quote', quoteRoutes);
app.use('/api/ddp', ddpRoutes);
app.use('/api/cooperations', cooperationRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/nav', navRoutes);
app.use('/api/port-services', portServicesRoutes);
app.use('/api/customs-coupons', customsCouponRoutes);
app.use('/api/overseas', overseasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/ai', aiAskRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/directory', directoryRoutes);
app.use('/api/consignees', consigneeRoutes);

// ── 生产环境：服务前端静态文件 ──
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, {
    maxAge: "7d",
    etag: true,
    lastModified: true,
  }));
  // SPA fallback: 所有非 API 路由返回 index.html
  app.get('*', (_req, res) => {
    const indexPath = path.join(frontendDist, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });
}

// ── Error Handler ──
app.use(errorHandler);

export default app;
