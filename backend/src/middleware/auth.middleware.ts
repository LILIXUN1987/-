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

export async function authRequired(req: Request, _res: Response, next: NextFunction) {
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

    // token_version 异步校验
    if (decoded.token_version !== undefined && decoded.id) {
      db('users').where({ id: decoded.id }).select('token_version').first()
        .then((user: any) => {
          if (user && user.token_version !== undefined && user.token_version !== decoded.token_version) {
            // Token 已被撤销（密码已修改）
          }
        })
        .catch(() => {});
    }

    // 同步校验用户状态：封禁/停用的用户立即拒绝
    try {
      const user = await db('users').where({ id: decoded.id }).select('status').first() as any;
      if (user) {
        if (user.status === 'suspended' || user.status === 'banned') {
          return next(new UnauthorizedError('账号已被禁用，请联系管理员'));
        }
        if (user.status === 'deleted') {
          return next(new UnauthorizedError('账号已注销'));
        }
      }
    } catch {
      // 查询失败不阻塞请求
    }

    next();
  } catch {
    next(new UnauthorizedError('登录已过期，请重新登录'));
  }
}
