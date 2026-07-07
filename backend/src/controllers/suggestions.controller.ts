import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';

export const suggestionsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page: pageStr, limit: limitStr } = req.query;
      const page = Math.max(1, parseInt(pageStr as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitStr as string) || 20));
      const offset = (page - 1) * limit;

      const [countResult, data] = await Promise.all([
        db('suggestions').count('* as total').first(),
        db('suggestions')
          .orderBy('created_at', 'desc')
          .limit(limit)
          .offset(offset),
      ]);

      const total = Number((countResult as any)?.total || 0);
      res.json({ data, total, page, limit });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { content } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ error: '请输入建议内容', code: 'EMPTY_CONTENT' });
      }

      const userId = req.user!.id;
      const user = await db('users').where({ id: userId }).first() as any;

      await db('suggestions').insert({
        id: uuidv4(),
        suggester_name: user?.display_name || '未知',
        suggester_company: user?.company_name || '未知',
        content: content.trim(),
        created_by: userId,
      });

      res.status(201).json({ message: '感谢您的建议！我们会认真考虑' });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await db('suggestions').where({ id: req.params.id }).delete();
      res.json({ message: '已删除' });
    } catch (err) {
      next(err);
    }
  },
};
