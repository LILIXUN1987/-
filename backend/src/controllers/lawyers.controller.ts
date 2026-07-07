import { Request, Response, NextFunction } from 'express';
import db from '../config/database';

export const lawyersController = {
  /** 获取律师列表（每日轮替排列 + 分页 + 搜索） */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, page: pageStr, limit: limitStr } = req.query;
      const page = Math.max(1, parseInt(pageStr as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(limitStr as string) || 12));

      let query = db('users')
        .where({ role: 'lawyer', status: 'approved' })
        .select(
          'id',
          'display_name',
          'company_name',
          'phone',
          'card_image',
          'avatar',
          'bio',
          'created_at',
          // 咨询量统计（仅统计标记为律师咨询的消息）
          db.raw('(SELECT COUNT(*) FROM messages WHERE messages.receiver_id = users.id AND messages.content LIKE \'【律师咨询】%\') as consult_count'),
        );

      // ── 搜索筛选（姓名/律所/自我介绍） ──
      if (search) {
        const kw = `%${search}%`;
        query = query.where(function () {
          this.where('display_name', 'like', kw)
            .orWhere('company_name', 'like', kw)
            .orWhere('bio', 'like', kw);
        });
      }

      const lawyers = await query;

      // ── 非搜索时才做每日轮替 ──
      // 搜索时应展示全部匹配结果，不做轮替
      if (!search && lawyers.length > 1) {
        const daysSinceEpoch = Math.floor(Date.now() / 86_400_000);
        const rotationOffset = daysSinceEpoch % lawyers.length;
        const rotated = [
          ...lawyers.slice(rotationOffset),
          ...lawyers.slice(0, rotationOffset),
        ] as typeof lawyers;

        const total = rotated.length;
        const start = (page - 1) * limit;
        const data = rotated.slice(start, start + limit);

        return res.json({ data, total, page, limit });
      }

      // 有搜索或只有单条记录 → 直接分页
      const total = lawyers.length;
      const start = (page - 1) * limit;
      const data = lawyers.slice(start, start + limit);

      res.json({ data, total, page, limit });
    } catch (err) {
      next(err);
    }
  },
};
