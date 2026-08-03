import db from '../config/database';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const TARGETS: Record<number, { cargos: number; queries: number }> = {
  1: { cargos: 15, queries: 20 },
  2: { cargos: 25, queries: 30 },
  3: { cargos: 35, queries: 40 },
};

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function daysRemainingInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate() + 1;
}

/** 每日更新考核数据 */
export async function updateProbationStats() {
  const month = getCurrentMonth();
  const monthStart = month + '-01';
  const nextMonthStart = new Date(new Date(monthStart).getTime() + 32 * 86400000).toISOString().slice(0, 7) + '-01';

  const active = await db('forwarder_probation')
    .where({ status: 'active', probation_month: month })
    .select('*') as any[];

  if (active.length === 0) return;

  logger.info(`[probation] 更新 ${active.length} 条考核记录 (${month})`);

  for (const record of active) {
    // 发布舱位数
    const cargosResult = await db('cargo_spaces')
      .where({ uploaded_by: record.user_id })
      .where('created_at', '>=', monthStart)
      .where('created_at', '<', nextMonthStart)
      .count('* as total')
      .first() as any;

    // 查询舱位次数
    const queriesResult = await db('search_logs')
      .where({ user_id: record.user_id })
      .where('created_at', '>=', monthStart)
      .where('created_at', '<', nextMonthStart)
      .count('* as total')
      .first() as any;

    await db('forwarder_probation').where({ id: record.id }).update({
      actual_cargos: Number(cargosResult?.total || 0),
      actual_queries: Number(queriesResult?.total || 0),
      updated_at: new Date().toISOString(),
    });
  }
}

/** 月底考核评估：是否达标 → 决定是否续期 */
export async function evaluateProbation() {
  const month = getCurrentMonth();
  const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
  const daysLeft = daysRemainingInMonth();

  // 只在月底最后2天才评估
  if (daysLeft > 2) return;

  const active = await db('forwarder_probation')
    .where({ status: 'active', probation_month: month })
    .select('*') as any[];

  if (active.length === 0) return;

  logger.info(`[probation] 月底评估 ${active.length} 条考核记录 (${month}, 距月底${daysLeft}天)`);

  for (const record of active) {
    // 先更新最新数据
    const monthStart = month + '-01';
    const nextMonthStart = new Date(new Date(monthStart).getTime() + 32 * 86400000).toISOString().slice(0, 7) + '-01';

    const cargosResult = await db('cargo_spaces')
      .where({ uploaded_by: record.user_id })
      .where('created_at', '>=', monthStart)
      .where('created_at', '<', nextMonthStart)
      .count('* as total').first() as any;

    const queriesResult = await db('search_logs')
      .where({ user_id: record.user_id })
      .where('created_at', '>=', monthStart)
      .where('created_at', '<', nextMonthStart)
      .count('* as total').first() as any;

    const actualCargos = Number(cargosResult?.total || 0);
    const actualQueries = Number(queriesResult?.total || 0);

    const target = TARGETS[record.month_number] || TARGETS[1];
    const passed = actualCargos >= target.cargos && actualQueries >= target.queries;

    const now = new Date().toISOString();
    const user = await db('users').where({ id: record.user_id }).first() as any;

    await db('forwarder_probation').where({ id: record.id }).update({
      actual_cargos: actualCargos,
      actual_queries: actualQueries,
      status: passed ? 'passed' : 'failed',
      evaluated_at: now,
      updated_at: now,
    });

    if (passed && record.month_number < 3) {
      // 续期 30 天 + 创建下月考核
      const currentEnd = user?.trial_end || new Date().toISOString().split('T')[0];
      const newEnd = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      await db('users').where({ id: record.user_id }).update({ trial_end: newEnd });

      const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 7);
      const nextTarget = TARGETS[record.month_number + 1] || TARGETS[3];
      await db('forwarder_probation').insert({
        id: uuidv4(),
        user_id: record.user_id,
        month_number: record.month_number + 1,
        target_cargos: nextTarget.cargos,
        target_queries: nextTarget.queries,
        actual_cargos: 0,
        actual_queries: 0,
        status: 'active',
        probation_month: nextMonth,
        created_at: now,
        updated_at: now,
      });

      logger.info(`[probation] ✅ ${user?.display_name || record.user_id} 第${record.month_number}月达标 (${actualCargos}/${target.cargos} + ${actualQueries}/${target.queries}) → 续期至 ${newEnd}`);
    } else if (!passed) {
      // 不续期
      logger.info(`[probation] ❌ ${user?.display_name || record.user_id} 第${record.month_number}月未达标 (${actualCargos}/${target.cargos} + ${actualQueries}/${target.queries}) → 取消后续赠送`);
    }
  }
}

/** 获取当前用户的考核状态 */
export async function getProbationStatus(userId: string) {
  const records = await db('forwarder_probation')
    .where({ user_id: userId })
    .orderBy('probation_month', 'asc')
    .select('*') as any[];

  if (records.length === 0) return null;

  const current = records.find((r: any) => r.status === 'active');
  const month = getCurrentMonth();
  const target = current ? TARGETS[current.month_number] || TARGETS[1] : null;

  return {
    enrolled: true,
    currentMonth: month,
    current: current ? {
      monthNumber: current.month_number,
      status: current.status,
      probationMonth: current.probation_month,
      targetCargos: current.target_cargos,
      targetQueries: current.target_queries,
      actualCargos: current.actual_cargos,
      actualQueries: current.actual_queries,
      progress: {
        cargosPct: Math.min(100, Math.round((current.actual_cargos / current.target_cargos) * 100)),
        queriesPct: Math.min(100, Math.round((current.actual_queries / current.target_queries) * 100)),
      },
    } : null,
    history: records.filter((r: any) => r.status !== 'active').map((r: any) => ({
      monthNumber: r.month_number,
      status: r.status,
      probationMonth: r.probation_month,
      actualCargos: r.actual_cargos,
      actualQueries: r.actual_queries,
      targetCargos: r.target_cargos,
      targetQueries: r.target_queries,
    })),
  };
}
