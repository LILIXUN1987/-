/**
 * 航空公司 IATA 二字代码 → 中文名称映射
 * 数据来源：机场二字代码-中文名称对照表1.csv
 * 导入日期：2026-06-09
 */
import airlines from './airline-codes-data.json';

/** 按 IATA 代码索引的航空公司映射 */
export const AIRLINE_CODE_MAP: Record<string, { en: string; zh: string }> = {};
for (const a of airlines) {
  if (a.code && !AIRLINE_CODE_MAP[a.code]) {
    AIRLINE_CODE_MAP[a.code] = { en: a.en, zh: a.zh };
  }
}

/** 所有航空公司 IATA 代码列表（用于正则匹配等） */
export const ALL_AIRLINE_CODES = Object.keys(AIRLINE_CODE_MAP).filter(c => /^[A-Z0-9]{2,3}$/.test(c));

/**
 * 根据 IATA 代码获取航空公司中文名
 */
export function getAirlineNameByCode(code: string): string | undefined {
  return AIRLINE_CODE_MAP[code.toUpperCase()]?.zh;
}

/**
 * 根据 IATA 代码获取航空公司英文名
 */
export function getAirlineEnglishNameByCode(code: string): string | undefined {
  return AIRLINE_CODE_MAP[code.toUpperCase()]?.en;
}

/**
 * 构建航空公司代码的正则字符串（用于航班号校验）
 * 返回格式如 "CZ|CA|MU|FX|..."
 */
export function buildAirlineRegexString(): string {
  return ALL_AIRLINE_CODES.join('|');
}
