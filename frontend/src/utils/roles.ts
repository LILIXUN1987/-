/**
 * 角色标签映射 — 集中管理所有角色相关的显示文案
 * 替换散落在 AdminLayout/LoginPage/ProfilePage/CardDirectoryPage 等处的三元判断链
 */

import type { UserRole } from '../types';
import type { LangText } from '../i18n';

/** 中文标签（用于数据库、统计等非 i18n 上下文） */
export const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  forwarder: '货代',
  trader: '外贸',
  lawyer: '律师',
  inspector: '检测认证',
  insurer: '运输保险',
  overseas_agent: '海外代理',
};

/** 中英双语标签 */
export const ROLE_I18N_LABELS: Record<string, LangText> = {
  admin: { zh: '管理员', en: 'Admin' },
  forwarder: { zh: '货代', en: 'Forwarder' },
  trader: { zh: '外贸', en: 'Trader' },
  lawyer: { zh: '律师', en: 'Lawyer' },
  inspector: { zh: '检测认证', en: 'Inspector' },
  insurer: { zh: '运输保险', en: 'Insurer' },
  overseas_agent: { zh: '海外代理', en: 'Overseas Agent' },
};

/** 获取角色双语标签 */
export function getRoleLabel(role: string | undefined, lang: 'zh' | 'en'): string {
  if (!role) return '';
  return ROLE_I18N_LABELS[role]?.[lang] || role;
}

/** 角色对应的图标 emoji */
export const ROLE_ICONS: Record<string, string> = {
  admin: '🏢',
  forwarder: '📦',
  trader: '🏭',
  lawyer: '⚖️',
  inspector: '🔬',
  insurer: '🛡️',
  overseas_agent: '🌍',
};
