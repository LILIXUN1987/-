import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import db from './config/database';
import authRoutes from './routes/auth.routes';
import filesRoutes from './routes/files.routes';
import cargoRoutes from './routes/cargo.routes';
import registerRoutes from './routes/register.routes';
import complaintsRoutes from './routes/complaints.routes';
import suggestionsRoutes from './routes/suggestions.routes';
import messagesRoutes from './routes/messages.routes';
import riskAlertRoutes from './routes/riskalert.routes';
import referralRoutes from './routes/referral.routes';
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
import inviteRoutes from './routes/invite.routes';
import navRoutes from './routes/nav.routes';
import portServicesRoutes from './routes/portServices.routes';
import customsCouponRoutes from './routes/customsCoupon.routes';
import overseasRoutes from './routes/overseas.routes';
import dashboardRoutes from './routes/dashboard.routes';

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
app.use(morgan('dev'));
// 限制请求体大小
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());


// ── Health Check（先测数据库，再返回） ──
app.get('/api/health', async (_req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected', timestamp: new Date().toISOString() });
  }
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
app.use('/api/referral', referralRoutes);
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
app.use('/api/invite-agent', inviteRoutes);
app.use('/api/nav', navRoutes);
app.use('/api/port-services', portServicesRoutes);
app.use('/api/customs-coupons', customsCouponRoutes);
app.use('/api/overseas', overseasRoutes);
app.use('/api/dashboard', dashboardRoutes);

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
