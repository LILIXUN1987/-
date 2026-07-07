import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';

export const favoritesController = {
  // 切换收藏状态（有则取消，无则添加）
  async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const { cargo_id } = req.body;
      const userId = req.user!.id;
      if (!cargo_id) return res.status(400).json({ error: '缺少货舱ID' });

      const existing = await db('favorites').where({ user_id: userId, cargo_id }).first();
      if (existing) {
        await db('favorites').where({ id: (existing as any).id }).delete();
        return res.json({ favorited: false, message: '已取消收藏' });
      }
      await db('favorites').insert({ id: uuidv4(), user_id: userId, cargo_id });
      res.json({ favorited: true, message: '已收藏' });
    } catch (err) { next(err); }
  },

  // 我的收藏列表（支持分页）
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page: pageStr, limit: limitStr } = req.query;
      const page = Math.max(1, parseInt(pageStr as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(limitStr as string) || 20));
      const offset = (page - 1) * limit;

      const [countResult, data] = await Promise.all([
        db('favorites').where('user_id', req.user!.id).count('* as total').first(),
        db('favorites')
          .leftJoin('cargo_spaces', 'favorites.cargo_id', 'cargo_spaces.id')
          .where('favorites.user_id', req.user!.id)
          .select(
            'cargo_spaces.id',
            'cargo_spaces.region',
            'cargo_spaces.warehouse_name',
            'cargo_spaces.origin_port',
            'cargo_spaces.dest_port',
            'cargo_spaces.airline_code',
            'cargo_spaces.available_cbm',
            'cargo_spaces.available_kg',
            'cargo_spaces.price_per_cbm',
            'cargo_spaces.price_per_kg',
            'cargo_spaces.currency',
            'cargo_spaces.cargo_type',
            'cargo_spaces.status',
            'cargo_spaces.notes',
            'cargo_spaces.valid_from',
            'cargo_spaces.valid_to',
            'cargo_spaces.contact_info',
            'cargo_spaces.created_at as cargo_created_at',
            'favorites.created_at as favorited_at',
          )
          .orderBy('favorites.created_at', 'desc')
          .limit(limit)
          .offset(offset),
      ]);

      const total = Number((countResult as any)?.total || 0);
      res.json({ data, total, page, limit });
    } catch (err) { next(err); }
  },

  // 检查当前用户是否收藏了指定 cargo_id
  async status(req: Request, res: Response, next: NextFunction) {
    try {
      const { cargo_id } = req.query;
      if (!cargo_id) return res.status(400).json({ error: '缺少 cargo_id' });
      const existing = await db('favorites')
        .where({ user_id: req.user!.id, cargo_id: cargo_id as string })
        .first();
      res.json({ favorited: !!existing });
    } catch (err) { next(err); }
  },

  // 批量检查收藏状态（cargo_ids 逗号分隔）
  async batchStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const ids = ((req.query.ids as string) || '').split(',').filter(Boolean);
      if (ids.length === 0) return res.json({ data: {} });
      const rows = await db('favorites')
        .where({ user_id: req.user!.id })
        .whereIn('cargo_id', ids)
        .select('cargo_id');
      const favorited: Record<string, boolean> = {};
      for (const id of ids) favorited[id] = false;
      for (const r of rows) favorited[(r as any).cargo_id] = true;
      res.json({ data: favorited });
    } catch (err) { next(err); }
  },
};
