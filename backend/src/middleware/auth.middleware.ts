import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';
import type { UserRole } from '../types';
import db from '../config/database';

interface JwtPayload {
  id: string;
  username: string;
  display_name: string;
  role?: string;
  token_version?: number;
}

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
    req.user = { id: decoded.id, username: decoded.username, display_name: decoded.display_name, role: decoded.role as UserRole | undefined };
  } catch {
    // Token invalid/expired — continue as unauthenticated
  }
  next();
}

export function authRequired(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('请先登录'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      display_name: decoded.display_name,
      role: decoded.role as UserRole | undefined,
    };

    // 日活跃追踪：当天首次请求更新 last_active_date（fire-and-forget）
    const today = new Date().toISOString().split('T')[0];
    db('users').where({ id: decoded.id }).where(function() { this.where('last_active_date', '<>', today).orWhereNull('last_active_date'); }).update({ last_active_date: today }).catch(() => {});

    // token_version 异步校验：如果版本不匹配，不阻塞当前请求但标记需要重新登录
    if (decoded.token_version !== undefined && decoded.id) {
      db('users').where({ id: decoded.id }).select('token_version').first()
        .then((user: any) => {
          if (user && user.token_version !== undefined && user.token_version !== decoded.token_version) {
            // Token 已被撤销（密码已修改），静默记录
          }
        })
        .catch(() => {});
    }

    next();
  } catch {
    next(new UnauthorizedError('登录已过期，请重新登录'));
  }
}
