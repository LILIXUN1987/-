import { Request, Response, NextFunction } from 'express';
import db from '../config/database';

const ROLE_MAP: Record<string, string> = {
  inspectors: 'inspector',
  insurers: 'insurer',
};

async function listByRole(req: Request, res: Response, next: NextFunction, role: string) {
  try {
    const { search, page: pageStr, limit: limitStr } = req.query;
    const page = Math.max(1, parseInt(pageStr as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(limitStr as string) || 12));

    let query = db('users')
      .where({ role, status: 'approved' })
      .select(
        'id',
        'display_name',
        'company_name',
        'phone',
        'card_image',
        'avatar',
        'bio',
        'created_at',
        db.raw(`(SELECT COUNT(*) FROM messages WHERE messages.receiver_id = users.id AND messages.content LIKE '【${role === 'inspector' ? '检测认证' : '运输保险'}咨询】%') as consult_count`),
      );

    if (search) {
      const kw = `%${search}%`;
      query = query.where(function () {
        this.where('display_name', 'like', kw)
          .orWhere('company_name', 'like', kw)
          .orWhere('bio', 'like', kw);
      });
    }

    const data = await query;
    const total = data.length;
    const start = (page - 1) * limit;
    const paged = data.slice(start, start + limit);

    res.json({ data: paged, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export const directoryController = {
  async inspectors(req: Request, res: Response, next: NextFunction) {
    return listByRole(req, res, next, 'inspector');
  },
  async insurers(req: Request, res: Response, next: NextFunction) {
    return listByRole(req, res, next, 'insurer');
  },
};
