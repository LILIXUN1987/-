import rateLimit from 'express-rate-limit';

// General API rate limiter — 收件箱每5秒轮询（12次/分钟）+ 正常操作
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMITED',
  },
});

// Chat API stricter rate limiter (Claude API is expensive)
export const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 chat requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: '查询请求过于频繁，请稍后再试',
    code: 'RATE_LIMITED',
  },
});

// Login rate limiter — 防止暴力破解
export const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 attempts per minute（测试环境频繁登录登出）
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: '登录尝试过于频繁，请稍后再试',
    code: 'LOGIN_RATE_LIMITED',
  },
});

// Search/推送 rate limiter — 防止刷需求推送
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 searches per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: '查询过于频繁，请稍后再试',
    code: 'SEARCH_RATE_LIMITED',
  },
});

// AI解析限流 — AI调用有成本
export const parseLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10次/分钟
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: '录入过于频繁，请稍后再试',
    code: 'PARSE_RATE_LIMITED',
  },
});

// 注册限流 — 防止批量注册
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5次/小时
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: '注册过于频繁，请稍后再试',
    code: 'REGISTER_RATE_LIMITED',
  },
});

// 找回密码限流 — 防止暴力发送验证码
export const forgotLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: '验证码发送过于频繁，请10分钟后再试',
    code: 'FORGOT_RATE_LIMITED',
  },
});

// 文件上传限流 — 每 IP 每10分钟最多50次（防止批量填满硬盘，但也给大货代集中注册留空间）
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: '上传过于频繁，请稍后再试',
    code: 'UPLOAD_RATE_LIMITED',
  },
});
