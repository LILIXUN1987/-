import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

/**
 * 要求当前登录用户为管理员
 * 利用 JWT 中已解码的 role 字段做快速检查
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return next(new ForbiddenError('仅管理员可操作'));
  }
  next();
}
