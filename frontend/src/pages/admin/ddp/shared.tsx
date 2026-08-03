import { createContext, useContext } from 'react';

// ════════════════════════════════════════════
// 语言类型 & 工具函数
// ════════════════════════════════════════════
export type Lang = 'zh' | 'en';
export interface LangText { zh: string; en: string }
export function t(text: LangText, lang: Lang): string { return text[lang]; }

export const LangContext = createContext<Lang>('zh');
export function useLang() { return useContext(LangContext); }

// ════════════════════════════════════════════
// 国家国旗映射
// ════════════════════════════════════════════
export const COUNTRY_FLAGS: Record<string, string> = {
  'USA': '🇺🇸', 'UK': '🇬🇧', 'Germany': '🇩🇪', 'France': '🇫🇷',
  'Japan': '🇯🇵', 'Korea': '🇰🇷', 'Australia': '🇦🇺', 'Canada': '🇨🇦',
  'Singapore': '🇸🇬', 'Malaysia': '🇲🇾', 'Thailand': '🇹🇭', 'Vietnam': '🇻🇳',
  'India': '🇮🇳', 'Indonesia': '🇮🇩', 'Philippines': '🇵🇭', 'UAE': '🇦🇪',
  'Saudi Arabia': '🇸🇦', 'Turkey': '🇹🇷', 'Russia': '🇷🇺', 'Netherlands': '🇳🇱',
  'Italy': '🇮🇹', 'Spain': '🇪🇸', 'Brazil': '🇧🇷', 'Mexico': '🇲🇽',
  'South Africa': '🇿🇦', 'Nigeria': '🇳🇬', 'Kenya': '🇰🇪', 'Egypt': '🇪🇬',
  'Belgium': '🇧🇪', 'Poland': '🇵🇱', 'Sweden': '🇸🇪', 'Switzerland': '🇨🇭',
  'Hong Kong': '🇭🇰', 'Taiwan': '🇹🇼', 'Panama': '🇵🇦', 'Chile': '🇨🇱',
  'Argentina': '🇦🇷', 'Peru': '🇵🇪', 'New Zealand': '🇳🇿',
  'Cambodia': '🇰🇭', 'Bangladesh': '🇧🇩', 'Pakistan': '🇵🇰', 'Sri Lanka': '🇱🇰',
  'Ghana': '🇬🇭', 'Tanzania': '🇹🇿', 'Angola': '🇦🇴',
  'Greece': '🇬🇷', 'Portugal': '🇵🇹', 'Ireland': '🇮🇪',
  'Denmark': '🇩🇰', 'Norway': '🇳🇴', 'Finland': '🇫🇮', 'Ukraine': '🇺🇦',
  英国: '🇬🇧', 德国: '🇩🇪', 法国: '🇫🇷', 日本: '🇯🇵',
  韩国: '🇰🇷', 澳大利亚: '🇦🇺', 加拿大: '🇨🇦', 新加坡: '🇸🇬',
  马来西亚: '🇲🇾', 泰国: '🇹🇭', 越南: '🇻🇳', 印度: '🇮🇳',
  印度尼西亚: '🇮🇩', 菲律宾: '🇵🇭', 阿联酋: '🇦🇪', 沙特阿拉伯: '🇸🇦',
  土耳其: '🇹🇷', 俄罗斯: '🇷🇺', 荷兰: '🇳🇱', 意大利: '🇮🇹',
  西班牙: '🇪🇸', 巴西: '🇧🇷', 墨西哥: '🇲🇽', 南非: '🇿🇦',
  尼日利亚: '🇳🇬', 肯尼亚: '🇰🇪',
};

export function getCountryEmoji(country: string): string {
  for (const [key, emoji] of Object.entries(COUNTRY_FLAGS)) {
    if (country.includes(key) || key.includes(country)) return emoji;
  }
  return '🌍';
}

// ════════════════════════════════════════════
// 页面级别文本（info提示、页面标题）
// ════════════════════════════════════════════
export const PAGE_T = {
  pageTitle: { zh: '🌍 全球DDP进出口到门服务', en: '🌍 Global DDP Door-to-Door' },
  pageSubtitle: { zh: '中国↔全球双向门到门 · 进出口清关派送 · 群友验证的靠谱海外代理', en: 'China ↔ Worldwide · Import/Export DDP · Community-verified agents' },
  tabInquiry: { zh: '📮 我要询价', en: '📮 Submit Inquiry' },
  tabAgents: { zh: '🤝 海外代理', en: '🤝 Overseas Agents' },
  tabStats: { zh: '📊 需求统计', en: '📊 Demand Stats' },
  infoTitle: { zh: '💡 什么是DDP到门服务？', en: '💡 What is DDP Door-to-Door?' },
  infoDesc1: { zh: 'DDP (Delivered Duty Paid) 指卖家承担所有运输费用、关税和风险，将货物直接送到买家指定地址。', en: 'DDP (Delivered Duty Paid) means the seller bears all transport costs, duties and risks, delivering goods directly to the buyer\'s address.' },
  infoDesc2: { zh: '本社区的海外代理均为群友验证或推荐的靠谱合作方。如果您有靠谱的海外代理想推荐给群友，请', en: 'All agents here are community-verified. To recommend a reliable overseas agent, please ' },
  infoDesc2Link: { zh: '联系管理员', en: 'contact the admin' },
  infoDesc2End: { zh: '入驻。', en: ' for onboarding.' },
  noAccess: { zh: '暂无权限查看', en: 'No access' },
  sendFailed: { zh: '发送失败', en: 'Send failed' },
};
