import db from '../config/database';

export interface TrustInfo {
  hints: string[];
  mutual_agents: { name: string }[];
  uploader_name: string;
  uploader_company: string;
  uploader_id: string;
  has_card: boolean;
  has_phone: boolean;
  days_since_reg: number;
  avg_rating: number | null;
  review_count: number;
  coop_count: number;
}

/**
 * 为搜索结果注入信任信息
 * 包括：共同代理、推荐链、同事、评分、实名认证、入驻天数
 */
export async function injectTrustInfo(
  items: any[],
  currentUserId: string,
): Promise<void> {
  if (!items.length) return;

  // 批量获取当前用户的信任关系（只查一次）
  const myCoopAgents = await db('cooperations')
    .where({ forwarder_user_id: currentUserId, status: 'confirmed' })
    .select('agent_user_id');

  const myReferrer = await db('referrals')
    .where({ referee_id: currentUserId })
    .select('referrer_id')
    .first() as any;

  const myReferees = await db('referrals')
    .where({ referrer_id: currentUserId })
    .select('referee_id');

  const currentUser = await db('users')
    .where({ id: currentUserId })
    .first() as any;

  const myCompany = currentUser?.company_name || '';

  for (const item of items) {
    const companyName = item.contact_info?.split(' ')[0];
    if (!companyName) continue;

    const uploader = await db('raw_messages')
      .leftJoin('users', 'raw_messages.uploaded_by', 'users.id')
      .where('raw_messages.id', item.uploaded_file_id)
      .select(
        'users.id as uploader_id',
        'users.display_name',
        'users.company_name',
        'users.card_image',
        'users.phone',
        'users.created_at',
      )
      .first() as any;

    if (!uploader?.uploader_id || uploader.uploader_id === currentUserId) continue;

    const trustHints: string[] = [];
    const mutualAgents: { name: string }[] = [];

    // 共同代理
    const uploaderCoops = await db('cooperations')
      .where({ forwarder_user_id: uploader.uploader_id, status: 'confirmed' })
      .select('agent_user_id');
    const uploaderAgentIds = new Set(
      uploaderCoops.map((c: any) => c.agent_user_id),
    );

    const sharedAgents = await db('users')
      .whereIn(
        'id',
        [...uploaderAgentIds].filter((id: string) =>
          myCoopAgents.some((mc: any) => mc.agent_user_id === id),
        ),
      )
      .select('display_name', 'company_name');

    for (const a of sharedAgents) {
      mutualAgents.push({ name: a.display_name || a.company_name });
      trustHints.push('mutual_agent');
    }

    // 推荐关系
    if (myReferees?.some((r: any) => r.referee_id === uploader.uploader_id)) {
      trustHints.push('referral:i_referred');
    }
    if (myReferrer?.referrer_id === uploader.uploader_id) {
      trustHints.push('referral:referred_me');
    }

    // 同公司
    if (myCompany && uploader.company_name && myCompany === uploader.company_name) {
      trustHints.push('same_company');
    }

    // 评分
    const uploaderReviews = await db('reviews')
      .where({ reviewee_id: uploader.uploader_id })
      .select('rating');
    const reviewTotal = uploaderReviews.length;
    const avgRating =
      reviewTotal > 0
        ? Number(
            (
              uploaderReviews.reduce((s: number, r: any) => s + r.rating, 0) /
              reviewTotal
            ).toFixed(1),
          )
        : null;

    // 合作数量
    const uploaderCoopCount = await db('cooperations')
      .where({ forwarder_user_id: uploader.uploader_id, status: 'confirmed' })
      .count('* as total')
      .first() as any;

    // 入驻天数
    const daysSinceReg = uploader.created_at
      ? Math.floor(
          (Date.now() - new Date(uploader.created_at).getTime()) / 86400000,
        )
      : 0;

    (item as any).trust_info = {
      hints: trustHints,
      mutual_agents: mutualAgents,
      uploader_name: uploader.display_name,
      uploader_company: uploader.company_name,
      uploader_id: uploader.uploader_id,
      has_card: !!uploader.card_image,
      has_phone: !!uploader.phone,
      days_since_reg: daysSinceReg,
      avg_rating: avgRating,
      review_count: reviewTotal,
      coop_count: Number(uploaderCoopCount?.total || 0),
    };
  }
}
