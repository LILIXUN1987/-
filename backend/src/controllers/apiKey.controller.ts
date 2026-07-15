import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from '../config/database';

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = 'sk_' + crypto.randomBytes(24).toString('hex');
  const prefix = raw.substring(0, 8);
  const hash = hashKey(raw);
  return { raw, prefix, hash };
}

export const apiKeyController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const keys = await db('api_keys')
        .select('id', 'key_prefix', 'name', 'status', 'last_used_at', 'created_at')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc');
      res.json({ data: keys });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { name } = req.body;

      // 限制最多5个活跃key
      const activeCount = await db('api_keys')
        .where({ user_id: userId, status: 'active' })
        .count('* as total')
        .first() as any;

      if (Number(activeCount?.total || 0) >= 5) {
        return res.status(400).json({ error: '最多同时拥有5个活跃密钥，请先吊销旧密钥' });
      }

      const { raw, prefix, hash } = generateApiKey();
      const id = uuidv4();

      await db('api_keys').insert({
        id,
        user_id: userId,
        key_prefix: prefix,
        key_hash: hash,
        name: name || '默认密钥',
      });

      // raw key 只返回一次，不再存储
      res.status(201).json({
        id,
        key_prefix: prefix,
        name: name || '默认密钥',
        raw_key: raw, // 仅此一次返回
        message: '请立即保存密钥，不再显示',
      });
    } catch (err) {
      next(err);
    }
  },

  async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const key = await db('api_keys').where({ id, user_id: userId }).first();
      if (!key) {
        return res.status(404).json({ error: '密钥不存在' });
      }

      await db('api_keys').where({ id }).update({ status: 'revoked' });
      res.json({ message: '密钥已吊销' });
    } catch (err) {
      next(err);
    }
  },
};
