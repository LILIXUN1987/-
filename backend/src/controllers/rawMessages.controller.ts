import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import XLSX from 'xlsx';

/**
 * 通用筛选条件构建
 * 在 count 查询和 data 查询间复用，消除重复代码
 */
function applyFilters(
  qb: any,
  filters: { category?: string; date_from?: string; date_to?: string; keyword?: string },
  tablePrefix = '',
) {
  const p = tablePrefix ? `${tablePrefix}.` : '';
  if (filters.category && filters.category !== '全部') {
    qb.where(`${p}category`, filters.category);
  }
  if (filters.date_from) {
    qb.where(`${p}created_at`, '>=', filters.date_from + ' 00:00:00');
  }
  if (filters.date_to) {
    qb.where(`${p}created_at`, '<=', filters.date_to + ' 23:59:59');
  }
  if (filters.keyword) {
    qb.where(`${p}content`, 'like', `%${filters.keyword}%`);
  }
}

export const rawMessagesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, date_from, date_to, keyword, page: pageStr, limit: limitStr } = req.query;
      const page = Math.max(1, parseInt(pageStr as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitStr as string) || 30));
      const offset = (page - 1) * limit;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';
      const filters = { category: category as string, date_from: date_from as string, date_to: date_to as string, keyword: keyword as string };

      // ── 总数查询 ──
      const countQuery = db('raw_messages');
      // 非管理员只查自己的，管理员查全部
      if (!isAdmin) countQuery.where('uploaded_by', userId);
      applyFilters(countQuery, filters);
      const countResult = await countQuery.count('* as total').first();
      const total = Number((countResult as any)?.total || 0);

      // ── 数据查询（带关联货舱数子查询） ──
      const dataQuery = db('raw_messages')
        .leftJoin('users', 'raw_messages.uploaded_by', 'users.id')
        .select(
          'raw_messages.id',
          'raw_messages.content',
          'raw_messages.keywords',
          'raw_messages.category',
          'raw_messages.uploaded_by',
          'raw_messages.created_at',
          'users.display_name as uploader_name',
          'users.company_name as uploader_company',
          // 关联货舱数量（子查询，利用 uploaded_file_id 索引）
          db.raw('(SELECT COUNT(*) FROM cargo_spaces WHERE cargo_spaces.uploaded_file_id = raw_messages.id) as cargo_count'),
        );
      // 非管理员只查自己的，管理员查全部
      if (!isAdmin) dataQuery.where('raw_messages.uploaded_by', userId);
      applyFilters(dataQuery, filters, 'raw_messages');

      const data = await dataQuery
        .orderBy('raw_messages.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      res.json({ data, total, page, limit });
    } catch (err) {
      next(err);
    }
  },

  /** 获取某条原始记录关联的货舱记录 */
  async getLinkedCargo(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';

      // 校验归属：管理员可看任何记录，非管理员只看自己的
      const rawQuery = db('raw_messages').where({ id });
      if (!isAdmin) rawQuery.where('uploaded_by', userId);
      const raw = await rawQuery.first();
      if (!raw) {
        return res.status(404).json({ error: '记录不存在' });
      }

      const cargo = await db('cargo_spaces')
        .where({ uploaded_file_id: id })
        .select(
          'id', 'region', 'warehouse_name', 'airline_code',
          'available_cbm', 'available_kg',
          'price_per_cbm', 'price_per_kg', 'currency',
          'valid_from', 'valid_to', 'cargo_type', 'status',
          'contact_info', 'notes', 'created_at',
        )
        .orderBy('created_at', 'desc');

      res.json({ data: cargo, total: cargo.length });
    } catch (err) {
      next(err);
    }
  },

  /** 导出原始记录为 Excel */
  async export(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, date_from, date_to, keyword } = req.body;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';
      const filters = { category: category as string, date_from: date_from as string, date_to: date_to as string, keyword: keyword as string };

      // 查询所有符合条件的记录（不分页）
      const dataQuery = db('raw_messages')
        .leftJoin('users', 'raw_messages.uploaded_by', 'users.id')
        .select(
          'raw_messages.id',
          'raw_messages.content',
          'raw_messages.keywords',
          'raw_messages.category',
          'raw_messages.uploaded_by',
          'raw_messages.created_at',
          'users.display_name as uploader_name',
          'users.company_name as uploader_company',
          db.raw('(SELECT COUNT(*) FROM cargo_spaces WHERE cargo_spaces.uploaded_file_id = raw_messages.id) as cargo_count'),
        );
      if (!isAdmin) dataQuery.where('raw_messages.uploaded_by', userId);
      applyFilters(dataQuery, filters, 'raw_messages');

      const records = await dataQuery.orderBy('raw_messages.created_at', 'desc');

      // 生成 Excel
      const excelData = records.map((r: any, i: number) => ({
        '序号': i + 1,
        '分类': r.category || '未分类',
        '原文内容': r.content,
        '关键词': r.keywords || '',
        '录入时间': r.created_at ? new Date(r.created_at).toLocaleString('zh-CN', { hour12: false }) : '',
        '上传人': r.uploader_name || '',
        '上传公司': r.uploader_company || '',
        '关联货舱数': r.cargo_count || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      // 设置列宽
      ws['!cols'] = [
        { wch: 6 },   // 序号
        { wch: 14 },  // 分类
        { wch: 60 },  // 原文内容
        { wch: 20 },  // 关键词
        { wch: 20 },  // 录入时间
        { wch: 12 },  // 上传人
        { wch: 30 },  // 上传公司
        { wch: 12 },  // 关联货舱数
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '原始记录');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=raw-records-${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buf);
    } catch (err) {
      next(err);
    }
  },

  /** 获取原始记录原文（供查询者联系发布者时附带） */
  async getRawContent(req: Request, res: Response, next: NextFunction) {
    try {
      const raw = await db('raw_messages')
        .where('id', req.params.id)
        .select('content', 'category', 'created_at')
        .first();

      if (!raw) return res.status(404).json({ error: '记录不存在' });
      res.json({ data: raw });
    } catch (err) { next(err); }
  },

  /** 批量删除原始记录（仅自己的） */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: '请选择要删除的记录' });
      }

      // 仅删除属于自己的记录
      const deleted = await db('raw_messages')
        .whereIn('id', ids)
        .where('uploaded_by', userId)
        .delete();

      res.json({ message: `成功删除 ${deleted} 条记录`, deleted });
    } catch (err) {
      next(err);
    }
  },
};
