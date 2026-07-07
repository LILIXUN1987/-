import db from '../config/database';
import { CargoSpace, CargoQueryFilters } from '../types';
import { NotFoundError } from '../utils/errors';

// Helper: SQLite LIKE with wildcard escaping（防注入：% 和 _ 是 LIKE 通配符）
function likeFilter(query: any, column: string, value: string | undefined) {
  if (value) {
    const escaped = value.replace(/[%_]/g, '\\$&');
    return query.where(column, 'like', `%${escaped}%`);
  }
  return query;
}

/**
 * 通用筛选条件构建
 * data 查询和 count 查询间复用
 */
function applyFilters(
  query: any,
  filters: {
    region?: string;
    warehouse_name?: string;
    cargo_type?: string;
    status?: string;
    valid_from?: string;
    valid_to?: string;
    min_cbm?: number;
    max_cbm?: number;
    min_kg?: number;
    max_kg?: number;
  },
) {
  let q = likeFilter(query, 'region', filters.region);
  q = likeFilter(q, 'warehouse_name', filters.warehouse_name);
  q = likeFilter(q, 'cargo_type', filters.cargo_type);

  if (filters.status) q = q.where('status', filters.status);
  if (filters.valid_from) q = q.where('valid_from', '>=', filters.valid_from);
  if (filters.valid_to) q = q.where('valid_to', '<=', filters.valid_to);
  if (filters.min_cbm !== undefined) q = q.where('available_cbm', '>=', filters.min_cbm);
  if (filters.max_cbm !== undefined) q = q.where('available_cbm', '<=', filters.max_cbm);
  if (filters.min_kg !== undefined) q = q.where('available_kg', '>=', filters.min_kg);
  if (filters.max_kg !== undefined) q = q.where('available_kg', '<=', filters.max_kg);

  return q;
}

export const cargoService = {
  async list(filters: CargoQueryFilters = {}) {
    const {
      region,
      warehouse_name,
      cargo_type,
      status,
      valid_from,
      valid_to,
      min_cbm,
      max_cbm,
      min_kg,
      max_kg,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = filters;

    const filterOpts = { region, warehouse_name, cargo_type, status, valid_from, valid_to, min_cbm, max_cbm, min_kg, max_kg };

    // ── 总数查询 ──
    const countQuery = applyFilters(db('cargo_spaces'), filterOpts);
    const countResult = await countQuery.count('* as total').first();

    // ── 数据查询 ──
    const allowedSortFields = ['region', 'warehouse_name', 'available_cbm', 'available_kg', 'valid_from', 'valid_to', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by as string) ? sort_by : 'created_at';
    const sortDir = sort_order === 'asc' ? 'asc' : 'desc';
    const offset = (page - 1) * limit;

    const dataQuery = applyFilters(db<CargoSpace>('cargo_spaces'), filterOpts);
    const data = await dataQuery
      .orderBy(sortField as string, sortDir)
      .limit(limit)
      .offset(offset);

    return {
      data,
      total: Number(countResult?.total || 0),
      page,
      limit,
    };
  },

  async getById(id: string): Promise<CargoSpace> {
    const cargo = await db<CargoSpace>('cargo_spaces').where({ id }).first();
    if (!cargo) {
      throw new NotFoundError('货舱记录不存在');
    }
    return cargo;
  },

  /** 检查用户是否为 cargo_spaces 记录的拥有者，返回 { cargo, isOwner } */
  async checkOwnership(cargoId: string, userId: string): Promise<{ cargo: any; isOwner: boolean }> {
    const cargo = await db('cargo_spaces').where({ id: cargoId }).first() as any;
    if (!cargo) return { cargo: null, isOwner: false };

    if (!cargo.uploaded_file_id) return { cargo, isOwner: false };

    // 同时检查 uploaded_files 和 raw_messages
    const [file, raw] = await Promise.all([
      db('uploaded_files').where({ id: cargo.uploaded_file_id }).first(),
      db('raw_messages').where({ id: cargo.uploaded_file_id }).first(),
    ]);
    if (file) return { cargo, isOwner: file.uploaded_by === userId };
    if (raw) return { cargo, isOwner: raw.uploaded_by === userId };

    return { cargo, isOwner: false };
  },

  async update(id: string, updates: Partial<CargoSpace>): Promise<CargoSpace> {
    await db<CargoSpace>('cargo_spaces')
      .where({ id })
      .update({ ...updates, updated_at: db.fn.now() });

    const updated = await db<CargoSpace>('cargo_spaces').where({ id }).first();
    if (!updated) {
      throw new NotFoundError('货舱记录不存在');
    }
    return updated;
  },

  async delete(id: string): Promise<void> {
    const deleted = await db('cargo_spaces').where({ id }).delete();
    if (!deleted) {
      throw new NotFoundError('货舱记录不存在');
    }
  },

  async getStats() {
    const [stats] = await db('cargo_spaces')
      .select(
        db.raw('COUNT(*) as total'),
        db.raw("SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available"),
        db.raw('COUNT(DISTINCT region) as regions'),
        db.raw("SUM(CASE WHEN valid_to < date('now') THEN 1 ELSE 0 END) as expired")
      );

    const [userCount] = await db('users').count('* as total');

    // ── 各分类当日推广统计 ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = todayStart.toISOString();

    const catRows = await db('cargo_spaces')
      .where('created_at', '>=', todayStr)
      .select(
        db.raw("CASE WHEN notes LIKE '%【空运出口】%' OR notes LIKE '%【空运包税出口】%' THEN 'air' WHEN notes LIKE '%【海运出口】%' OR notes LIKE '%【海运包税出口】%' THEN 'sea' WHEN notes LIKE '%【快递出口】%' THEN 'express' WHEN notes LIKE '%【陆运出口】%' THEN 'land' ELSE 'other' END as cat"),
        db.raw('COUNT(*) as cnt')
      )
      .groupByRaw("CASE WHEN notes LIKE '%【空运出口】%' OR notes LIKE '%【空运包税出口】%' THEN 'air' WHEN notes LIKE '%【海运出口】%' OR notes LIKE '%【海运包税出口】%' THEN 'sea' WHEN notes LIKE '%【快递出口】%' THEN 'express' WHEN notes LIKE '%【陆运出口】%' THEN 'land' ELSE 'other' END");

    const catCounts: Record<string, number> = { air: 0, sea: 0, express: 0, land: 0, other: 0 };
    for (const r of catRows) {
      catCounts[(r as any).cat] = Number((r as any).cnt) || 0;
    }

    return {
      total: Number(stats.total) || 0,
      available: Number(stats.available) || 0,
      regions: Number(stats.regions) || 0,
      expired: Number(stats.expired) || 0,
      users: Number(userCount?.total || 0),
      categories: catCounts,
    };
  },

  /** RAG/chat system query */
  async queryForChat(conditions: Partial<CargoQueryFilters>, limit = 20): Promise<CargoSpace[]> {
    let query = db<CargoSpace>('cargo_spaces')
      .where('status', 'available')
      .where('valid_to', '>=', db.raw("date('now')"));

    query = likeFilter(query, 'region', conditions.region);
    query = likeFilter(query, 'cargo_type', conditions.cargo_type);
    query = likeFilter(query, 'warehouse_name', conditions.warehouse_name);

    return query
      .orderBy('available_cbm', 'desc')
      .limit(limit);
  },
};
