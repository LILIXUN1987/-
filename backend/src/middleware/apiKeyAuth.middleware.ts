import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import db from '../config/database';

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * API Key 认证中间件
 * 支持两种方式：
 * 1. Header: X-API-Key: sk_xxx
 * 2. 同时兼容 JWT auth（已通过 authRequired 的跳过）
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  // 如果已经通过 JWT 认证，跳过
  if ((req as any).user?.id) {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    return res.status(401).json({ error: '请提供 API Key（Header: X-API-Key）' });
  }

  if (!apiKey.startsWith('sk_')) {
    return res.status(401).json({ error: '无效的 API Key 格式' });
  }

  try {
    const hash = hashKey(apiKey);
    const keyRecord = await db('api_keys')
      .where({ key_hash: hash, status: 'active' })
      .first() as any;

    if (!keyRecord) {
      return res.status(401).json({ error: 'API Key 无效或已吊销' });
    }

    // 获取用户信息
    const user = await db('users')
      .select('id', 'username', 'display_name', 'company_name', 'role', 'status', 'trial_end')
      .where({ id: keyRecord.user_id })
      .first() as any;

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    // 更新最后使用时间
    await db('api_keys').where({ id: keyRecord.id }).update({
      last_used_at: db.fn.now(),
    });

    (req as any).user = user;
    (req as any).apiKeyId = keyRecord.id;
    next();
  } catch (err) {
    next(err);
  }
}
