import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';

export const reviewsController = {
  // ── 为某用户添加评价 ──
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { reviewee_id, rating, comment } = req.body;
      const reviewerId = req.user!.id;

      if (!reviewee_id || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: '参数不完整或评分无效' });
      }
      if (reviewerId === reviewee_id) {
        return res.status(400).json({ error: '不能给自己评价' });
      }

      // 检查是否有过消息往来
      const msgCount = await db('messages')
        .where(function () {
          this.where({ sender_id: reviewerId, receiver_id: reviewee_id })
            .orWhere({ sender_id: reviewee_id, receiver_id: reviewerId });
        })
        .count('* as total').first();

      if (Number((msgCount as any)?.total || 0) === 0) {
        return res.status(403).json({ error: '只能评价与您有过消息往来的用户' });
      }

      // 检查是否已经评价过
      const existing = await db('reviews')
        .where({ reviewer_id: reviewerId, reviewee_id })
        .first();

      if (existing) {
        // 更新已有评价
        await db('reviews')
          .where({ reviewer_id: reviewerId, reviewee_id })
          .update({ rating, comment: comment || null });
        return res.json({ message: '评价已更新' });
      }

      await db('reviews').insert({
        id: uuidv4(),
        reviewer_id: reviewerId,
        reviewee_id,
        rating,
        comment: comment || null,
      });

      res.status(201).json({ message: '评价成功' });
    } catch (err) { next(err); }
  },

  // ── 获取某用户的评价统计 ──
  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      const rows = await db('reviews')
        .where({ reviewee_id: userId })
        .select('rating')
        .orderBy('created_at', 'desc');

      const list = await db('reviews')
        .leftJoin('users', 'reviews.reviewer_id', 'users.id')
        .where('reviews.reviewee_id', userId)
        .select(
          'reviews.rating',
          'reviews.comment',
          'reviews.created_at',
          'users.display_name as reviewer_name',
          'users.company_name as reviewer_company',
        )
        .orderBy('reviews.created_at', 'desc')
        .limit(20);

      const total = rows.length;
      const sum = rows.reduce((acc: number, r: any) => acc + r.rating, 0);
      const average = total > 0 ? (sum / total).toFixed(1) : '0.0';

      res.json({
        total,
        average: Number(average),
        list,
      });
    } catch (err) { next(err); }
  },
};
