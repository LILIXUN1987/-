import db from '../config/database';

/**
 * 纯函数：根据已有数据计算信用分（用于批量场景，避免N+1查询）
 */
export function computeScoreFromData(params: {
  avgRating: number;
  reviewCount: number;
  totalCoops: number;
  totalDisputes: number;
  hasCard: boolean;
  daysSinceReg: number;
}): number {
  let score = 50;
  if (params.reviewCount > 0) {
    score += (params.avgRating / 5) * 30;
  } else {
    score += 10;
  }
  score += Math.min(params.totalCoops, 50) * 0.5;
  score -= params.totalDisputes * 15;
  if (params.hasCard) score += 10;
  if (params.daysSinceReg >= 365) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export interface CreditScoreResult {
  score: number;
  level: string;
  details: {
    avgRating: string;
    reviewCount: number;
    totalCoops: number;
    totalDisputes: number;
    daysSinceReg: number;
    hasCard: boolean;
  };
}

/**
 * 统一信用分计算（0-100）
 * 公式：
 *   基础分 50
 *   + 评价分 (avgRating/5 * 30, 无评价给10)
 *   + 合作分 (min(coops, 50) * 0.5, 封顶25)
 *   - 争议扣分 (disputes * 15)
 *   + 名片认证 (10)
 *   + 注册满1年 (5)
 *
 * 所有模块统一调用此函数，不再各自实现
 */
export async function calculateCreditScore(userId: string): Promise<CreditScoreResult> {
  // 1. 评价统计
  let avgRating = 0;
  let reviewCount = 0;
  try {
    const reviews = await db('reviews').where({ reviewee_id: userId }).select('rating');
    reviewCount = reviews.length;
    avgRating = reviewCount > 0
      ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviewCount
      : 0;
  } catch { /* ignore */ }

  // 2. 已确认合作数（双向：作为货代或代理都算）
  let totalCoops = 0;
  try {
    const coopRow = await db('cooperations')
      .where(function () {
        this.where({ forwarder_user_id: userId }).orWhere({ agent_user_id: userId });
      })
      .where({ status: 'confirmed' })
      .count('* as total').first() as any;
    totalCoops = Number(coopRow?.total || 0);
  } catch { /* ignore */ }

  // 3. 争议数
  let totalDisputes = 0;
  try {
    const disputeRow = await db('dispute_cases')
      .where({ respondent_id: userId })
      .count('* as total').first() as any;
    totalDisputes = Number(disputeRow?.total || 0);
  } catch { /* ignore */ }

  // 4. 名片认证 + 注册天数
  let hasCard = false;
  let daysSinceReg = 0;
  try {
    const user = await db('users').where({ id: userId }).first() as any;
    hasCard = !!user?.card_image;
    daysSinceReg = user?.created_at
      ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
      : 0;
  } catch { /* ignore */ }

  // ── 计算 ──
  let score = 50; // 基础分
  if (reviewCount > 0) {
    score += (avgRating / 5) * 30;
  } else {
    score += 10;
  }
  score += Math.min(totalCoops, 50) * 0.5; // 封顶25
  score -= totalDisputes * 15;
  if (hasCard) score += 10;
  if (daysSinceReg >= 365) score += 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // ── 等级 ──
  let level = '基础可信';
  if (score >= 90) level = '行业金口碑';
  else if (score >= 75) level = '非常可靠';
  else if (score >= 60) level = '信誉良好';

  return {
    score,
    level,
    details: {
      avgRating: reviewCount > 0 ? avgRating.toFixed(1) : '—',
      reviewCount,
      totalCoops,
      totalDisputes,
      daysSinceReg,
      hasCard,
    },
  };
}
