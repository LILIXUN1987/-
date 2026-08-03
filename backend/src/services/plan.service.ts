import db from '../config/database';

export type PlanTier = 'free' | 'standard' | 'pro' | 'enterprise';

export interface PlanLimits {
  maxCargoPosts: number;       // 每月发布舱位数，-1 = 无限制
  maxInquiries: number;        // 每月询价次数，-1 = 无限制
  dailyAiQueries: number;      // AI问答每日次数
  couponsPerMonth: number;     // 报关券月发放数
  maxDdpInquiries: number;     // 海外代理每月可查看的DDP询价数，-1 = 无限制，0 = 不适用
  maxDirectoryDownloads: number; // 展会通讯录下载次数，-1 = 无限制，0 = 不适用
  canViewOverseasAgent: boolean;  // 能否查看海外代理
  canContactOverseasAgent: boolean; // 能否联系海外代理
  canUseDDP: boolean;          // 能否使用DDP
  priorityPost: boolean;       // 舱位置顶权重
  canManageTeam: boolean;      // 团队子账号
  canUseApi: boolean;          // API密钥
  canExportData: boolean;      // 数据导出
  hasDedicatedManager: boolean;  // 专属客户经理（Enterprise独有）
  hasBrandShowcase: boolean;     // 品牌展示页（Enterprise独有）
  hasAnalyticsReport: boolean;   // 询价数据分析报告（Enterprise独有）
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxCargoPosts: 5,
    maxInquiries: 100,
    dailyAiQueries: 5,
    couponsPerMonth: 0,
    maxDdpInquiries: -1,       // 免费版不限制DDP询价
    canViewOverseasAgent: true,
    canContactOverseasAgent: true,
    canUseDDP: true,
    priorityPost: false,
    canManageTeam: false,
    canUseApi: false,
    canExportData: false,
    maxDirectoryDownloads: 1,
    hasDedicatedManager: false,
    hasBrandShowcase: false,
    hasAnalyticsReport: false,
  },
  standard: {
    maxCargoPosts: 50,
    maxInquiries: 600,
    dailyAiQueries: 50,
    couponsPerMonth: 1,
    maxDdpInquiries: -1,      // 无限制（海外代理付费后）
    canViewOverseasAgent: true,
    canContactOverseasAgent: true,
    canUseDDP: true,
    priorityPost: false,
    canManageTeam: false,
    canUseApi: false,
    canExportData: false,
    hasDedicatedManager: false,
    hasBrandShowcase: false,
    hasAnalyticsReport: false,
    maxDirectoryDownloads: -1,
  },
  pro: {
    maxCargoPosts: -1,
    maxInquiries: -1,
    dailyAiQueries: -1,
    couponsPerMonth: 2,
    maxDdpInquiries: -1,      // 无限制
    canViewOverseasAgent: true,
    canContactOverseasAgent: true,
    canUseDDP: true,
    priorityPost: false,
    canManageTeam: false,
    canUseApi: false,
    canExportData: false,
    hasDedicatedManager: false,
    hasBrandShowcase: false,
    hasAnalyticsReport: false,
    maxDirectoryDownloads: -1,
  },
  enterprise: {
    maxCargoPosts: -1,
    maxInquiries: -1,
    dailyAiQueries: -1,
    couponsPerMonth: 3,
    maxDdpInquiries: -1,      // 无限制
    canViewOverseasAgent: true,
    canContactOverseasAgent: true,
    canUseDDP: true,
    priorityPost: true,
    canManageTeam: true,
    canUseApi: true,
    canExportData: true,
    hasDedicatedManager: false,
    hasBrandShowcase: false,
    hasAnalyticsReport: false,
    maxDirectoryDownloads: -1,
  },
};

export const PLAN_PRICES: Record<PlanTier, { price: number; label: string }> = {
  free: { price: 0, label: '免费版' },
  standard: { price: 19.90, label: '标准版' },
  pro: { price: 49.90, label: '专业版' },
  enterprise: { price: 169.00, label: '企业版' },
};

// ── 海外代理专属套餐 ──
export const OVERSEAS_PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxCargoPosts: 0,           // 海外代理不发布舱位
    maxInquiries: 0,            // 海外代理不发起询价
    dailyAiQueries: 5,
    couponsPerMonth: 0,
    maxDdpInquiries: 5,         // 每月免费5条询价
    canViewOverseasAgent: false,
    canContactOverseasAgent: true,
    canUseDDP: true,
    priorityPost: false,
    canManageTeam: false,
    canUseApi: false,
    canExportData: false,
    hasDedicatedManager: false,
    hasBrandShowcase: false,
    hasAnalyticsReport: false,
    maxDirectoryDownloads: 1,
  },
  standard: {
    maxCargoPosts: 0,
    maxInquiries: 0,
    dailyAiQueries: 50,
    couponsPerMonth: 0,
    maxDdpInquiries: -1,        // 无限制
    canViewOverseasAgent: false,
    canContactOverseasAgent: true,
    canUseDDP: true,
    priorityPost: false,
    canManageTeam: false,
    canUseApi: false,
    canExportData: false,
    hasDedicatedManager: false,
    hasBrandShowcase: false,
    hasAnalyticsReport: false,
    maxDirectoryDownloads: -1,
  },
  pro: {
    maxCargoPosts: 0,
    maxInquiries: 0,
    dailyAiQueries: -1,
    couponsPerMonth: 0,
    maxDdpInquiries: -1,        // 无限制
    canViewOverseasAgent: false,
    canContactOverseasAgent: true,
    canUseDDP: true,
    priorityPost: true,         // 热门路线标签置顶
    canManageTeam: false,
    canUseApi: false,
    canExportData: false,
    hasDedicatedManager: false,
    hasBrandShowcase: false,
    hasAnalyticsReport: false,
    maxDirectoryDownloads: -1,
  },
  enterprise: {
    maxCargoPosts: 0,
    maxInquiries: 0,
    dailyAiQueries: -1,
    couponsPerMonth: 0,
    maxDdpInquiries: -1,
    canViewOverseasAgent: false,
    canContactOverseasAgent: true,
    canUseDDP: true,
    priorityPost: true,
    canManageTeam: true,
    canUseApi: true,
    canExportData: true,
    hasDedicatedManager: true,   // 专属客户经理
    hasBrandShowcase: true,      // 品牌展示页
    hasAnalyticsReport: true,    // 询价数据分析报告
    maxDirectoryDownloads: -1,
  },
};

export const OVERSEAS_PLAN_PRICES: Record<PlanTier, { price: number; label: string; currency: string }> = {
  free: { price: 0, label: 'Free', currency: 'USD' },
  standard: { price: 19.99, label: 'Standard', currency: 'USD' },
  pro: { price: 39.99, label: 'Pro', currency: 'USD' },
  enterprise: { price: 169.00, label: 'Enterprise', currency: 'USD' },
};

// ── 海外代理分区定价 ──
// 功能完全相同，价格按国家经济发展水平分区
export type PriceZone = 'A' | 'B' | 'C' | 'D';

export const ZONE_PRICES: Record<PriceZone, Record<PlanTier, { price: number; label: string; currency: string }>> = {
  A: {
    free: { price: 0, label: 'Free', currency: 'USD' },
    standard: { price: 19.99, label: 'Standard', currency: 'USD' },
    pro: { price: 39.99, label: 'Pro', currency: 'USD' },
    enterprise: { price: 169.00, label: 'Enterprise', currency: 'USD' },
  },
  B: {
    free: { price: 0, label: 'Free', currency: 'USD' },
    standard: { price: 12.99, label: 'Standard', currency: 'USD' },
    pro: { price: 24.99, label: 'Pro', currency: 'USD' },
    enterprise: { price: 99.00, label: 'Enterprise', currency: 'USD' },
  },
  C: {
    free: { price: 0, label: 'Free', currency: 'USD' },
    standard: { price: 7.99, label: 'Standard', currency: 'USD' },
    pro: { price: 15.99, label: 'Pro', currency: 'USD' },
    enterprise: { price: 69.00, label: 'Enterprise', currency: 'USD' },
  },
  D: {
    free: { price: 0, label: 'Free', currency: 'USD' },
    standard: { price: 4.99, label: 'Standard', currency: 'USD' },
    pro: { price: 9.99, label: 'Pro', currency: 'USD' },
    enterprise: { price: 39.00, label: 'Enterprise', currency: 'USD' },
  },
};

// 国家 → 定价区映射
export const COUNTRY_ZONE: Record<string, PriceZone> = {
  US: 'A', CA: 'A', GB: 'A', DE: 'A', FR: 'A', IT: 'A', ES: 'A', NL: 'A',
  BE: 'A', CH: 'A', AT: 'A', SE: 'A', DK: 'A', NO: 'A', FI: 'A', IE: 'A',
  PT: 'A', GR: 'A', LU: 'A', MT: 'A', CY: 'A',
  SG: 'A', JP: 'A', KR: 'A', AU: 'A', NZ: 'A',
  HK: 'A',
  AE: 'A', SA: 'A', QA: 'A', KW: 'A', BH: 'A', OM: 'A', IL: 'A',
  MY: 'B', TR: 'A', RU: 'B', BR: 'B', MX: 'B', AR: 'B',
  CL: 'B', CR: 'B', PA: 'B', UY: 'B', CO: 'B', PE: 'B',
  TH: 'B', KZ: 'B', BY: 'B', BG: 'B', RS: 'B', RO: 'B',
  HU: 'B', PL: 'B', HR: 'B', SK: 'B', LV: 'B', LT: 'B', EE: 'B',
  CZ: 'B', SI: 'B', MK: 'B',
  EG: 'B', ZA: 'A', DZ: 'B', TN: 'B', LY: 'B', GA: 'B', BW: 'B', NA: 'B',
  IN: 'C', VN: 'C', ID: 'C', PH: 'C', LK: 'C',
  UA: 'C', GE: 'C', AM: 'C', AZ: 'C',
  MA: 'C', JO: 'C', PS: 'C', IQ: 'C',
  SV: 'C', GT: 'C', NI: 'C', EC: 'C', BO: 'C', PY: 'C',
  MM: 'C', KH: 'C', LA: 'C', MN: 'C',
  NG: 'A', GH: 'C', CI: 'C', SN: 'C', CM: 'C', KE: 'C', TZ: 'C',
  UG: 'C', RW: 'C', ET: 'C', ZM: 'C', ZW: 'C', MZ: 'C', AO: 'C', CG: 'C',
};

export function getCountryZone(country: string): PriceZone {
  const upper = country.toUpperCase();
  return COUNTRY_ZONE[upper] || 'C';
}

export function getOverseasPrices(country: string): Record<PlanTier, { price: number; label: string; currency: string }> {
  const zone = getCountryZone(country);
  return ZONE_PRICES[zone];
}

/** 获取用户的实际可用套餐（到期自动降级） */
export async function getEffectivePlan(userId: string): Promise<{ tier: PlanTier; trialEnd: string | null; isExpired: boolean }> {
  const user = await db('users').where({ id: userId }).first() as any;
  if (!user) return { tier: 'free', trialEnd: null, isExpired: true };

  const tier = (user.plan_tier || 'free') as PlanTier;
  const trialEnd = user.trial_end || null;

  // 没有到期日
  if (!trialEnd) {
    // free 套餐没有到期日 = 永久免费，不算过期
    if (tier === 'free') return { tier: 'free', trialEnd: null, isExpired: false };
    return { tier: 'free', trialEnd: null, isExpired: true };
  }

  const trialDate = new Date(trialEnd + 'T23:59:59');
  const isExpired = trialDate < new Date();

  // 到期后自动降级
  if (isExpired && tier !== 'free') {
    await db('users').where({ id: userId }).update({ plan_tier: 'free', plan_updated_at: new Date().toISOString() });
    return { tier: 'free', trialEnd, isExpired: true };
  }

  return { tier, trialEnd, isExpired: false };
}

/** 获取套餐权益描述（角色感知） */
export function getPlanLimits(tier: PlanTier, role?: string): PlanLimits {
  if (role === 'overseas_agent') {
    return OVERSEAS_PLAN_LIMITS[tier] || OVERSEAS_PLAN_LIMITS.free;
  }
  return PLAN_LIMITS[tier] || PLAN_LIMITS.free;
}
