import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../utils/logger';

export interface AuditEntry {
  action: string;
  target_type: string;
  target_id?: string;
  target_name?: string;
  detail?: any;
  operator_id: string;
}

/**
 * 记录审核操作日志
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db('audit_logs').insert({
      id: uuidv4(),
      action: entry.action,
      target_type: entry.target_type,
      target_id: entry.target_id || null,
      target_name: entry.target_name || null,
      detail: entry.detail ? JSON.stringify(entry.detail) : null,
      operator_id: entry.operator_id,
      created_at: db.fn.now(),
    });
  } catch (err) {
    logger.error('写入审核日志失败:', err);
  }
}

/**
 * 获取审核日志列表
 */
export async function getAuditLogs(page = 1, limit = 50, filter?: { action?: string; target_type?: string }) {
  const offset = (page - 1) * limit;
  let query = db('audit_logs')
    .leftJoin('users', 'audit_logs.operator_id', 'users.id')
    .select(
      'audit_logs.*',
      'users.display_name as operator_name',
    );

  if (filter?.action) query = query.where('audit_logs.action', filter.action);
  if (filter?.target_type) query = query.where('audit_logs.target_type', filter.target_type);

  const countQuery = db('audit_logs');
  if (filter?.action) countQuery.where('action', filter.action);
  if (filter?.target_type) countQuery.where('target_type', filter.target_type);
  const countResult = await countQuery.count('* as total').first();

  const data = await query
    .orderBy('audit_logs.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return {
    data,
    total: Number((countResult as any)?.total || 0),
    page,
    limit,
  };
}
