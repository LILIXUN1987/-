import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { env } from '../config/env';
import logger from '../utils/logger';
import { ALL_CHINESE_AIRPORT_CITIES as CN_CITIES, ALL_PORTS_MATCH_LIST, buildPortRegex, getCodeByCityName, getAllCityNamesByCode, isMainlandCode, isMainlandCity, isHongKongMacau, isForeignCity } from '../data/airport-codes';
import { ALL_AIRLINE_CODES } from '../data/airline-codes';

interface ParsedCargoRow {
  region: string;
  warehouse_name?: string;
  airline_code?: string;
  origin_port?: string;
  dest_port?: string;
  available_cbm: number;
  available_kg: number;
  price_per_cbm?: number;
  price_per_kg?: number;
  currency: string;
  valid_from: string;
  valid_to: string;
  cargo_type?: string;
  cargo_restrictions?: string;
  contact_info?: string;
  notes?: string;
}

/** Build a regex to match all known location/country/port names */
const LOCATION_REGEX = (() => {
  const all = ALL_PORTS_MATCH_LIST
    .filter(p => p.length >= 2)
    .sort((a, b) => b.length - a.length)
    .map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(all.join('|'), 'g');
})();

/** Extract all known location/country/port keywords from original text */
function extractLocationKeywords(text: string): string[] {
  const matches = text.match(LOCATION_REGEX);
  if (!matches) return [];
  // Only keep unique, reverse so longer comes last (keeping first match)
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of matches) {
    const key = m.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(m);
    }
  }
  return result;
}

/** Append any missing location keywords from original text to each row's notes */
function appendLocationsToNotes(rows: ParsedCargoRow[], allLocations: string[]): ParsedCargoRow[] {
  if (allLocations.length === 0 || rows.length === 0) return rows;

  for (const row of rows) {
    const currentNotes = row.notes || '';
    const missing: string[] = [];
    for (const loc of allLocations) {
      if (!currentNotes.includes(loc) && !(row.region || '').includes(loc)) {
        missing.push(loc);
      }
    }
    if (missing.length > 0) {
      row.notes = currentNotes + (currentNotes ? '；' : '') + missing.join('/');
    }
  }
  return rows;
}

/** 查找原文中所有"城市+航司-目的港"格式的路由（用matchAll找全部匹配） */
function findAllRoutes(text: string): { originCity: string; destCode: string }[] {
  const results: { originCity: string; destCode: string }[] = [];
  // 格式1: "城市+航司-目的港代码"（如"北京HU-BER"、"鄂州I9-HHN"、"郑州CV--LUX"）
  const regex1 = /([一-鿿]+)[A-Z0-9]{2,3}[\-－—]{1,2}([A-Z]{3})/g;
  let m;
  while ((m = regex1.exec(text)) !== null) {
    results.push({ originCity: m[1], destCode: m[2] });
  }
  // 格式2: "城市-目的港代码"（如"深圳-LAX"、"郑州--LUX"）
  if (results.length === 0) {
    const regex2 = /([一-鿿]+)[\-－—]{1,2}([A-Z]{3})/g;
    while ((m = regex2.exec(text)) !== null) {
      results.push({ originCity: m[1], destCode: m[2] });
    }
  }
  // 格式3: 【XXX自有渠道】格式（如"【DAC自有渠道】"），XXX=目的港代码
  // 然后找"城市+航司"格式的行，每条都是一个始发城市到此目的港的路由
  const channelMatch = text.match(/【([A-Z0-9]{3})自有渠道】/);
  if (channelMatch && results.length === 0) {
    const destFromChannel = channelMatch[1];
    const cityAirlineRegex = /([一-鿿]+)([A-Z0-9]{2,3})(?=\s|$|\d)/g;
    let caMatch;
    while ((caMatch = cityAirlineRegex.exec(text)) !== null) {
      const city = caMatch[1];
      if (!results.some(r => r.originCity === city && r.destCode === destFromChannel)) {
        results.push({ originCity: city, destCode: destFromChannel });
      }
    }
  }

  // 格式4: "XXX外配舱位"或"XXX外配"格式（如"LAX外配舱位"），XXX=共同目的港代码
  if (results.length === 0) {
    const outerMatch = text.match(/([A-Z]{3})(?:外配舱位|外配)/);
    if (outerMatch) {
      const destCode = outerMatch[1];
      // 在段首/行首找城市名（在已知城市列表中）
      const knownCities = ['广州','深圳','上海','北京','香港','杭州','宁波','南京','成都','重庆',
        '武汉','西安','昆明','厦门','青岛','天津','大连','郑州','长沙','福州','海口','三亚',
        '乌鲁木齐','哈尔滨','沈阳','贵阳','南宁','兰州','合肥','南昌','呼和浩特','银川','西宁',
        '拉萨','珠海','揭阳','湛江','惠州','佛山','梅州','温州','义乌','舟山','徐州','常州',
        '南通','无锡','扬州','盐城','烟台','威海','临沂','日照','鄂州','宜昌','襄阳','绵阳',
        '泸州','宜宾','西昌','丽江','大理','西双版纳','敦煌','包头','鄂尔多斯'];
      for (const city of knownCities) {
        // 城市名出现在段首/空格后/：后/换行后（不在单词中间）
        const cityRegex = new RegExp('(?:^|[\\s，：:,\\n])' + city + '(?=[A-Z0-9]|直飞|统配)', 'm');
        if (cityRegex.test(text) && !results.some(r => r.originCity === city && r.destCode === destCode)) {
          results.push({ originCity: city, destCode: destCode });
        }
      }
    }
  }
  return results;
}

/** 修正AI解析结果：如果region只有始发港没有目的港，自动从原文提取 */
function fixRouteInRows(rows: ParsedCargoRow[], originalText: string): ParsedCargoRow[] {
  // 识别原文中所有路由（可能有多个，如"海口HU-LHR"和"北京HU-BER"）
  const routeMatches = findAllRoutes(originalText);

  for (const { originCity, destCode } of routeMatches) {
    const fullRoute = originCity + '-' + destCode;
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + 1, 0);
    const monthEnd = nextMonth.toISOString().split('T')[0];

    // 修正已有记录：填充 origin_port / dest_port
    for (const row of rows) {
      if (row.region === originCity) row.region = fullRoute;
      if (row.warehouse_name === originCity) row.warehouse_name = fullRoute;
      if (row.region === fullRoute || row.region === originCity) {
        if (!row.origin_port) row.origin_port = originCity;
        if (!row.dest_port) row.dest_port = destCode;
        else if (!row.dest_port.includes(destCode)) row.dest_port = destCode + ',' + row.dest_port;
      }
    }

    // ★ 修正AI将多条路由解析到同一个region的问题
    // 如 notes='鄂州O3-BUD' 但 region='鄂州-LGG' → 修正为 region='鄂州-BUD'
    for (const row of rows) {
      const notes = row.notes || '';
      if (row.region !== fullRoute) continue;
      if (notes.includes(originCity) && notes.includes('-')) {
        const actualDestMatch = notes.match(new RegExp(originCity + '[A-Z0-9]{2,3}[-]([A-Z]{3})'));
        if (actualDestMatch) {
          const actualDest = actualDestMatch[1];
          if (actualDest !== destCode) {
            const correctRoute = originCity + '-' + actualDest;
            row.region = correctRoute;
            row.warehouse_name = correctRoute;
          }
        }
      }
    }

    // ★ 如果AI遗漏了整条路由，从原文创建它
    if (!rows.some(r => r.region === fullRoute || r.region === originCity + '-' + destCode)) {
      // 从AI解析结果中取模板
      const template = rows.find(r => r.region && r.region.includes('-')) || rows[rows.length - 1] || {} as ParsedCargoRow;
      rows.push({
        region: fullRoute,
        origin_port: originCity,
        dest_port: destCode,
        warehouse_name: fullRoute,
        available_cbm: 0,
        available_kg: 0,
        currency: 'CNY',
        valid_from: today,
        valid_to: monthEnd,
        notes: originalText.substring(0, 500),
        contact_info: template.contact_info || undefined,
        price_per_kg: template.price_per_kg || undefined,
        cargo_restrictions: undefined,
      });
    }

    // ── 去重：如果已有一条完整路由，删除AI多拆出来的纯目的港记录 ──
    const hasMainRoute = rows.some(r => r.region === fullRoute);
    if (hasMainRoute) {
      // 常见目的港代码→城市名映射（避免require动态加载问题）
      const DEST_CITY_MAP: Record<string, string> = {
        LAX: '洛杉矶', SFO: '旧金山', ORD: '芝加哥', NYC: '纽约', JFK: '纽约',
        LHR: '伦敦', CDG: '巴黎', FRA: '法兰克福', AMS: '阿姆斯特丹',
        NRT: '东京', HND: '东京', KIX: '大阪', ICN: '首尔', SIN: '新加坡',
        BKK: '曼谷', SGN: '胡志明', HKG: '香港', MFM: '澳门', TPE: '台北',
        SYD: '悉尼', MEL: '墨尔本', DXB: '迪拜', AUH: '阿布扎比',
        BER: '柏林', MUC: '慕尼黑', DUS: '杜塞尔多夫', HAM: '汉堡',
        STR: '斯图加特', HAJ: '汉诺威', BRE: '不来梅', CGN: '科隆',
        LEJ: '莱比锡', NUE: '纽伦堡', FMO: '明斯特',
        MAN: '曼彻斯特', DUB: '都柏林', BFS: '贝尔法斯特',
        LGG: '列日', BRU: '布鲁塞尔',
      };
      const destCityName = DEST_CITY_MAP[destCode] || null;

      for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];
        // AI常把▶收XXX 目的港 单独拆成一条记录（region=目的港city, warehouse=目的港city）
        // 这种记录只有纯目的港信息，在已有完整路由的情况下是冗余的
        if (destCityName && row.region === destCityName && row.warehouse_name === destCityName) {
          rows.splice(i, 1);
          continue;
        }
        // region和warehouse都是同一个三字代码（如"LAX"），且原文没提到独立站点
        if (/^[A-Z]{3}$/.test(row.region) && row.region === row.warehouse_name && row.region !== originCity) {
          rows.splice(i, 1);
          continue;
        }
      }
    }
  }

  // ── 卡转点解析：从原文提取所有卡转点三字码，为每条路由生成延伸记录 ──
  // 格式："卡转点: BRE,CGN,DUS,..." 或 "卡车转：MAN,DUB,BFS,..."
  // 注意：一条信息可能有多个卡车转/卡转点（如海口+LHR的+北京的BER）
  const truckMatches = [...originalText.matchAll(/卡[车转][转点][：:]?\s*([A-Z,\s]+)/g)];
  for (const truckMatch of truckMatches) {
    const truckCodes = truckMatch[1].split(/[,，\s]+/).filter(c => /^[A-Z0-9]{3}$/i.test(c));
    if (truckCodes.length === 0) continue;

    // 确定哪个始发港和主目的港属于这段卡转点
    // 策略：取卡转点前面的文本中最近的始发港
    const beforeTruck = originalText.substring(0, truckMatch.index);
    let matchedOriginCity = '';
    let matchedDestCode = '';
    let bestPos = -1;
    for (const rm of routeMatches) {
      const pos = beforeTruck.indexOf(rm.originCity);
      if (pos >= 0 && pos > bestPos) {
        bestPos = pos;
        matchedOriginCity = rm.originCity;
        matchedDestCode = rm.destCode;
      }
    }
    if (!matchedOriginCity || !matchedDestCode) continue;
    const mainRouteKey = matchedOriginCity + '-' + matchedDestCode;

    // 把卡转点代码追加到主路由记录的notes和warehouse_name中
    for (const row of rows) {
      if (row.region === mainRouteKey || row.region === matchedOriginCity) {
        const notes = row.notes || '';
        const missingTrucks = truckCodes.filter(tc => !notes.includes(tc) && !(row.region || '').includes(tc));
        if (missingTrucks.length > 0) {
          row.notes = notes + (notes.endsWith('；') || notes.endsWith('\n') ? '' : '；') + '卡转点:' + missingTrucks.join('/');
          row.warehouse_name = row.warehouse_name + '(可转:' + missingTrucks.join('/') + ')';
        }
      }
    }

    // 为每个卡转点生成独立记录
    for (const tc of truckCodes) {
      if (tc === matchedDestCode) continue;
      const truckRoute = matchedDestCode + '-' + tc;
      if (!rows.some(r => r.region === truckRoute)) {
        const template = rows.find(r => r.region === mainRouteKey) || rows[rows.length - 1];
        rows.push({
          region: truckRoute,
          warehouse_name: truckRoute + '(卡转)',
          available_cbm: template?.available_cbm || 0,
          available_kg: template?.available_kg || 0,
          currency: template?.currency || 'CNY',
          valid_from: template?.valid_from || new Date().toISOString().split('T')[0],
          valid_to: template?.valid_to || (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString().split('T')[0]; })(),
          notes: originalText.substring(0, 500),
          contact_info: template?.contact_info || undefined,
        });
      }
    }
  }

  // 修复价格：找 "数字 数字" 格式（如"+100 56.0" 或 "100 56.0"）
  for (const row of rows) {
    if (row.price_per_kg == null || row.price_per_kg === 0) {
      const priceMatch = originalText.match(/\+?\d+(?:\.\d+)?\s+(\d+\.?\d*)/);
      if (priceMatch && parseFloat(priceMatch[1]) > 0) {
        row.price_per_kg = parseFloat(priceMatch[1]);
      }
    }

    // 修复cargo_restrictions（已废弃，但在旧记录中可能还有）
    if (!row.cargo_restrictions) {
      const restrictions: string[] = [];
      const addMatch = originalText.match(/\+(\d+)\s/);
      if (addMatch) restrictions.push('+' + addMatch[1]);
      const dateMatch2 = originalText.match(/(\d+)\s*号起/);
      if (dateMatch2) restrictions.push(dateMatch2[1] + '号起');
      if (originalText.includes('固定包板') || originalText.includes('BSA')) restrictions.push('固定包板(BSA)');
      if (originalText.includes('带锂电') || originalText.includes('锂电')) restrictions.push('可接带锂电货物');
      if (restrictions.length > 0) row.cargo_restrictions = restrictions.join('；');
    }
  }

  return rows;
}

/**
 * Parse free-form text to structured cargo data.
 * Uses Claude when API key is configured, otherwise falls back to basic parsing.
 */
/** 最终安全校验：清理AI将最低起收量误识别为单价的问题 + 补充airline_code */
function sanitizePrices(rows: ParsedCargoRow[], originalText: string): void {
  // ── airline_code 回退：AI没提取时从原文匹配已知航司代码 ──
  if (originalText) {
    for (const row of rows) {
      if (!row.airline_code) {
        for (const code of ALL_AIRLINE_CODES) {
          const re = new RegExp('(?:^|[\\s,\\-－—，、]|[一-龥])' + code + '(?=[\\s,\\-－—，、]|$|[一-龥])');
          if (re.test(originalText)) {
            row.airline_code = code;
            break;
          }
        }
      }
    }
  }

  // 检查原文是否有"XXX公斤以上/XXXKG以上"（最低起收量，不是价格）
  const kgThreshold = originalText.match(/(\d{2,})\s*(?:公斤以上|KG以上|公斤起|KG起)/);
  if (kgThreshold) {
    const thresholdKg = parseInt(kgThreshold[1]);
    for (const row of rows) {
      // 修正 available_kg
      if (row.available_kg === 0 || row.available_kg === thresholdKg) {
        row.available_kg = thresholdKg;
      }
      // 如果 price_per_kg 等于这个阈值数字 → 清空（误解为单价了）
      if (row.price_per_kg != null && row.price_per_kg === thresholdKg) {
        row.price_per_kg = undefined;
      }
    }
  }

  // 原文出现"特价""优惠"但没明确单价 → 清空价格
  if (/特价|优惠/.test(originalText)) {
    const hasExplicitPrice = /(\d+(?:\.\d+)?)\s*(?:元|RMB|USD|CNY|￥|\$|€|\/KG|\/CBM)/i.test(originalText) ||
                             /\d+(?:\.\d+)?\s*\/\s*(?:KG|CBM)/i.test(originalText);
    if (!hasExplicitPrice) {
      for (const row of rows) {
        row.price_per_kg = undefined;
        row.price_per_cbm = undefined;
      }
    }
  }
}

export async function parseTextToCargo(text: string): Promise<ParsedCargoRow[]> {
  // Helper: extract all location/country keywords from original text
  const allLocations = extractLocationKeywords(text);

  let rows: ParsedCargoRow[];

  // Try AI first if configured
  if (env.deepseekApiKey && env.deepseekApiKey !== 'sk-your-deepseek-key') {
    try {
      rows = await parseWithAI(text);
    } catch (err) {
      logger.error('AI text parsing failed, falling back to basic:', err);
      rows = parseBasic(text);
    }
  } else if (env.anthropicApiKey && env.anthropicApiKey !== 'sk-ant-...') {
    try {
      rows = await parseWithAI(text);
    } catch (err) {
      logger.error('AI text parsing failed, falling back to basic:', err);
      rows = parseBasic(text);
    }
  } else {
    rows = parseBasic(text);
  }

  rows = fixRouteInRows(appendLocationsToNotes(rows, allLocations), text);
  sanitizePrices(rows, text);

  // ── 兜底填充 origin_port / dest_port ──
  const portRegex = buildPortRegex();
  for (const row of rows) {
    if (!row.origin_port) row.origin_port = row.region && row.region !== '未知' ? row.region : undefined;
    if (!row.dest_port && text) {
      const codes = text.match(/[A-Z]{3}/g) || [];
      const validCodes = [...new Set(codes)].filter(c => !/^(?:CBM|KG|KGS|TON|LBS|RMB|USD|EUR|BUP)$/i.test(c));
      if (validCodes.length > 0) {
        row.dest_port = validCodes.find(c => !row.origin_port?.includes(c)) || validCodes[validCodes.length - 1];
      } else {
        const ports = text.match(portRegex) || [];
        const uniq = [...new Set(ports)];
        if (uniq.length > 1) row.dest_port = uniq[uniq.length - 1];
        else if (uniq.length === 1 && uniq[0] !== row.origin_port) row.dest_port = uniq[0];
      }
    }
  }

  // ── 清除已废弃的字段 ──
  for (const row of rows) {
    delete (row as any).cargo_restrictions;
  }

  // ── 兜底填充 notes：AI丢失原文时用原文补充 ──
  if (text && text.length > 30) {
    for (const row of rows) {
      if (!row.notes || row.notes.length < 20 || (text.length > 50 && row.notes.length < text.length * 0.2)) {
        row.notes = text.substring(0, 500).trim();
      }
    }
  }

  // ── 合并卡转点 + 清理 origin_port ──
  // 先填充 origin_port 回退（卡转点孤儿记录的 region 可能是 "BER-BRE"）
  for (const r of rows) {
    if (!r.origin_port && r.region) {
      // 如果 region 是 "BER-BRE" 格式 → 这是卡转点孤儿，跳过
      if (/^[A-Z]{3}[-][A-Z]{3}$/i.test(r.region)) continue;
      r.origin_port = r.region !== '未知' ? r.region : undefined;
    }
  }
  // 过滤：origin_port 为纯IATA代码或路由格式的（如"LHR""BER-BRE"）→ 是卡转点孤儿记录，丢弃
  rows = rows.filter(r => !r.origin_port || (!/^[A-Z]{3}$/.test(r.origin_port) && !/^[A-Z]{3}[-][A-Z]{3}$/i.test(r.origin_port)));
  // 按 origin_port 去重：每个始发港只保留一条记录，dest_port 用自己的不混用
  const originGroups = new Map<string, ParsedCargoRow>();
  for (const r of rows) {
    if (!r.origin_port) continue;
    let op = r.origin_port;
    if (op.includes('-')) op = op.split('-')[0]; // "北京-BER" → "北京"
    if (!originGroups.has(op)) {
      originGroups.set(op, { ...r, origin_port: op });
    } else {
      // 同一始发港已存在记录时，合并 dest_port 和 notes（追加不覆盖）
      const existing = originGroups.get(op)!;
      if (r.dest_port) {
        const existingCodes = (existing.dest_port || '').split(',').map(c => c.trim()).filter(Boolean);
        for (const c of r.dest_port.split(/[,，、\s/]+/)) {
          const code = c.trim().toUpperCase();
          if (code && /^[A-Z0-9]{2,3}$/.test(code) && !existingCodes.includes(code)) {
            existingCodes.push(code);
          }
        }
        existing.dest_port = existingCodes.join(',');
      }
    }
  }
  // 从 notes 中提取卡转点代码补到 dest_port
  for (const group of originGroups.values()) {
    if (group.notes) {
      const truckMatch = group.notes.match(/卡车?转[点站]?[：:]?\s*([A-Z]{3}(?:[\/,，、\s]+[A-Z]{3})+)/i);
      if (truckMatch) {
        const codes = truckMatch[1].split(/[\/,，、\s]+/).map((c: string) => c.trim().toUpperCase()).filter(Boolean);
        const existingDest = (group.dest_port || '').split(',').map(c => c.trim()).filter(Boolean);
        for (const c of codes) {
          if (!existingDest.includes(c)) existingDest.push(c);
        }
        group.dest_port = existingDest.join(',');
      }
    }
  }

  rows = Array.from(originGroups.values());

  // ── 兜底提取：从"城市+航司+现舱：▶XXX"格式中提取AI遗漏的目的港 ──
  if (text) {
    // 找 "广州TK现舱" / "深圳TK现舱" 等格式
    const sectionRegex = /([一-鿿]+)([A-Z0-9]{2,3})现舱[：:]?\s*([\s\S]*?)(?=[一-鿿]+[A-Z0-9]{2,3}现舱|$)/g;
    let sectionMatch;
    while ((sectionMatch = sectionRegex.exec(text)) !== null) {
      const originCity = sectionMatch[1];
      const sectionBody = sectionMatch[3];
      // 找 ▶XXX 或 ▶ XXX 格式
      const destCodes = sectionBody.match(/▶\s*([A-Z]{3})/g) || [];
      if (destCodes.length > 0) {
        const codes = destCodes.map((m: string) => m.replace(/▶\s*/, '').trim());
        // 看是否已有该 origin 的记录
        const existing = rows.find(r => r.origin_port === originCity);
        if (existing) {
          const existingCodes = (existing.dest_port || '').split(',').map(c => c.trim()).filter(Boolean);
          for (const c of codes) {
            if (!existingCodes.includes(c)) existingCodes.push(c);
          }
          existing.dest_port = existingCodes.join(',');
        }
      }
    }
  }

  // ── 最终校验：用搜索逻辑验证 parsed 结果能否被查到 ──
  // 如果搜索逻辑提取的始发港/目的港在 parsed 结果中没有，则回退覆盖
  if (text && text.length > 10) {
    try {
      // 模拟搜索扩展逻辑（与 cargo.controller.ts searchByCategory 一致）
      const rawTerms = text.split(/[\s+\/\-－—]+|到|至/).filter(Boolean);
      const expandedTerms: string[] = [];
      for (const t of rawTerms) {
        expandedTerms.push(t);
        const code = getCodeByCityName(t);
        if (code) {
          expandedTerms.push(code);
          const aliases = getAllCityNamesByCode(code);
          for (const a of aliases) if (a !== t) expandedTerms.push(a);
        }
        if (/^[A-Z0-9]{3}$/i.test(t)) {
          const cities = getAllCityNamesByCode(t.toUpperCase());
          for (const city of cities) expandedTerms.push(city);
        }
      }

      const searchOriginTerms: string[] = [];
      const searchDestTerms: string[] = [];
      for (const t of expandedTerms) {
        if (/^[A-Z0-9]{3}$/.test(t)) {
          if (!/^\d{3}$/.test(t)) {
            if (isMainlandCode(t) || t === 'HKG' || t === 'MFM') {
              if (!searchOriginTerms.includes(t)) searchOriginTerms.push(t);
            } else {
              if (!searchDestTerms.includes(t)) searchDestTerms.push(t);
            }
          }
        } else if (isMainlandCity(t)) {
          if (!searchOriginTerms.includes(t)) searchOriginTerms.push(t);
        } else if (isForeignCity(t)) {
          if (!searchDestTerms.includes(t)) searchDestTerms.push(t);
        }
      }

      // 对每条记录校验
      for (const row of rows) {
        if (!row.origin_port || !row.dest_port) continue;

        // 检查 origin_port 是否包含搜索能识别的始发港词
        const originMatch = searchOriginTerms.length === 0 || searchOriginTerms.some(
          t => row.origin_port!.includes(t) || t.includes(row.origin_port!)
        );
        // 检查 dest_port 是否包含搜索能识别的目的港词
        const destMatch = searchDestTerms.length === 0 || searchDestTerms.some(
          t => row.dest_port!.toUpperCase().includes(t.toUpperCase())
        );

        // 如果不匹配，用搜索提取的值回退覆盖
        if (!originMatch && searchOriginTerms.length > 0) {
          // 找到第一个中文名作为 origin_port
          const cnOrigin = searchOriginTerms.find(t => !/^[A-Z0-9]{3}$/.test(t)) || searchOriginTerms[0];
          row.origin_port = cnOrigin;
        }
        if (!destMatch && searchDestTerms.length > 0) {
          // 找到第一个非中文的代码作为 dest_port 主港
          const codeDest = searchDestTerms.find(t => /^[A-Z]{3}$/.test(t)) || searchDestTerms[0];
          // 保留已有的 dest_port 中可能存在的卡转点
          const existingPorts = (row.dest_port || '').split(',').map((c: string) => c.trim()).filter(Boolean);
          const allPorts = [codeDest, ...existingPorts.filter((c: string) => c.toUpperCase() !== codeDest.toUpperCase())];
          row.dest_port = [...new Set(allPorts)].join(',');
        }
      }
    } catch (err) {
      // 校验失败不阻塞返回
      logger.error('搜索匹配校验失败:', err);
    }
  }

  return rows;
}

/**
 * AI-powered parsing - handles complex natural language
 */
async function parseWithAI(text: string): Promise<ParsedCargoRow[]> {
  const { aiChat, isAiConfigured } = await import('./ai.service');

  if (!isAiConfigured()) {
    throw new Error('未配置 AI API Key（DEEPSEEK_API_KEY）');
  }

  const today = new Date().toISOString().split('T')[0];

  const response = await aiChat(
    `你是一个国际物流货舱数据提取助手。用户会输入货舱仓位信息，每条信息描述一个独立仓库或航线的仓位情况。

【物流术语理解】
- "X号起收"（如"CZ 5号起收"）：南方航空4号航班已满载，新订舱最早可订5号航班。notes中保留原文日期描述
- "X号大仓位"（如"6号大仓位"）：6号航班还有很多空余舱位，仓位充裕。notes中保留原文日期描述
- "头程"：起运地到第一目的港航段，notes中保留
- "直飞"：不经中转，notes中描述"直飞"
- "随时定"：仓位随时可订，notes中描述"随时可定"
- "仓位紧张"：舱位很少，notes中描述"仓位紧张"
- "仓位宽松"：舱位充足，notes中描述"仓位宽松"
- airline_code: 提取原文中的航司二字代码（如CZ/CA/MU/FX等），放在airline_code字段。如果是空运出口但找不到航司代码填null
	- "城市+航司+三字码"格式（如"深圳NH-LAX"）：深圳=始发城市，NH=航司代码(全日空)，LAX=目的港代码。origin_port填"深圳"，dest_port填"LAX"，airline_code填"NH"
- "卡转点"或"卡车转"格式（如"卡转点: BRE,CGN,DUS"或"卡转点：BRE,CGN,DUS"）：表示空运到主目的港后，从主目的港卡车转运到这些城市。所有目的港代码（主目的港+所有卡转点）都放在dest_port字段，用逗号分隔。例如dest_port填"BER,BRE,CGN,DUS"
- "+数字 数字"格式（如"+100 56.0"）：+100表示每KG加收100元，56.0表示基础运价每KG56元。price_per_kg填56.0
	- "特价"、"优惠"、"特价收货"、"特价处理"：表示有折扣优惠但**未明确给出具体单价**，price_per_kg和price_per_cbm都填null
	- "XXX公斤以上"、"XXXKG以上"、"XXX公斤起"、"只接XXXKG+"：**只表示最低起收重量，不是单价！** 例如"500公斤以上"=最少500KG起收。available_kg填这个数字，price_per_kg不要再填这个数字
- "BUP"（Build-Up Pallet）：整板运输，货主自行码货整板交运，不是目的地也不是三字代码，notes中注明"可整板运输(BUP)"

【重要规则】
1. 每条记录是独立的仓库或航线，不要把不同地区的仓库合并
2. ⚠️【铁律】notes字段必须逐字完整抄录原文中出现的**所有**城市名、国家名、港口名、三字代码，一条都不能少。原文有10个国家名，notes就必须有10个。禁止截断、禁止汇总、禁止归类！
3. origin_port: 始发港城市中文名（如"广州""深圳"）不要放IATA代码
4. dest_port: 目的港IATA代码优先（如"LAX""ORD"），无代码填城市名（如"芝加哥"）
5. airline_code: 航空公司二字代码（必填）——原文中出现的航司代码提取到这里
6. 不同地区的仓库必须分成多条独立记录

每条记录字段：
- origin_port: 始发港城市中文名（必填）
- dest_port: 目的港IATA代码或城市名（必填）
- valid_from: 仓位起始日期（默认今天，不用解析）
- airline_code: 航空公司二字代码（必填）
- notes: 备注——原文中的仓位描述、限制条件、所有城市/港口名等（可选）

只返回 JSON 数组。`,
    `请提取货舱数据：\n\n${text}`
  );

  // Parse JSON from response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('无法从 AI 响应中提取 JSON 数据');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) {
    throw new Error('AI 返回的数据格式不正确');
  }

  return parsed.map((row) => normalizeRow(row, today, text));
}

// ── city/region definitions ──

// International ports & seaports (not in Chinese airport list)
const EXTRA_LOCATIONS = [
  '俄罗斯莫斯科', '俄罗斯', '莫斯科',
  '洛杉矶', '纽约', '芝加哥', '休斯顿', '旧金山', '迈阿密',
  '伦敦', '汉堡', '鹿特丹', '新加坡', '东京', '大阪', '釜山', '曼谷', '雅加达',
  '迪拜', '悉尼', '墨尔本', '胡志明', '吉隆坡', '马尼拉', '河内', '金边', '仰光',
  '德里', '孟买', '达卡', '科伦坡', '伊斯坦布尔', '莫斯科',
  '盐田', '蛇口', '南沙', '洋山', '北仑',
  '越南', '泰国', '印度', '德国', '法国', '英国', '巴西', '日本', '韩国',
];

const KNOWN_LOCATIONS = [...CN_CITIES, ...EXTRA_LOCATIONS].sort((a, b) => b.length - a.length);

/**
 * Find all known location mentions in text, with their positions.
 */
function findLocations(text: string): { name: string; pos: number; end: number }[] {
  const found: { name: string; pos: number; end: number }[] = [];
  const used = new Set<number>(); // track used positions to avoid overlaps

  for (const loc of KNOWN_LOCATIONS) {
    let idx = 0;
    while (idx < text.length) {
      const pos = text.indexOf(loc, idx);
      if (pos === -1) break;

      // Check if this position overlaps with an already-matched location
      const overlaps = [...used].some((u) => pos >= u && pos < u + 10); // rough overlap check
      if (!overlaps) {
        found.push({ name: loc, pos, end: pos + loc.length });
        used.add(pos);
      }
      idx = pos + 1;
    }
  }

  // Also find "XX到YY" route patterns by matching known cities
  // e.g., if "广州" and "纽约" are both found nearby with "到" between them
  for (let i = 0; i < found.length; i++) {
    const city = found[i];
    if (city.name.includes('到')) continue; // already a route

    // Look for "到" after this city
    const afterCity = text.substring(city.end);
    const daoMatch = afterCity.match(/^到/);
    if (!daoMatch) continue;

    // Look for a destination city right after "到"
    const afterDao = afterCity.substring(1);
    for (const dest of KNOWN_LOCATIONS) {
      if (afterDao.startsWith(dest)) {
        // Found a route: "广州到纽约"
        const routeName = city.name + '到' + dest;
        const routeEnd = city.end + 1 + dest.length;

        // Remove individual city matches that fall within this route
        for (let j = found.length - 1; j >= 0; j--) {
          if (j !== i && found[j].pos >= city.pos && found[j].end <= routeEnd && !found[j].name.includes('到')) {
            found.splice(j, 1);
            if (j < i) i--;
          }
        }
        // Replace the source city with the route
        found[i] = { name: routeName, pos: city.pos, end: routeEnd };
        break;
      }
    }
  }

  found.sort((a, b) => a.pos - b.pos);

  // Merge adjacent locations (e.g., "俄罗斯" + "莫斯科")
  const merged: { name: string; pos: number; end: number }[] = [];
  for (let i = 0; i < found.length; i++) {
    const curr = found[i];
    const prev = merged[merged.length - 1];
    if (prev && curr.pos - prev.end <= 3 && !curr.name.includes('到') && !prev.name.includes('到')) {
      // Merge adjacent locations
      prev.name = text.substring(prev.pos, curr.end);
      prev.end = curr.end;
    } else {
      merged.push({ ...curr });
    }
  }

  return merged;
}

/**
 * Basic keyword-based parsing - fallback when Claude is not available.
 * Uses known city/region names to split text into per-route entries.
 */
function parseBasic(text: string): ParsedCargoRow[] {
  const today = new Date().toISOString().split('T')[0];
  const results: ParsedCargoRow[] = [];

  const locations = findLocations(text);

  // If no Chinese locations found, try to extract 3-letter airport codes
  if (locations.length === 0) {
    const codes = text.match(/[A-Z]{3}/g) || [];
    const uniqueCodes = [...new Set(codes)];
    const airportCodes = uniqueCodes.filter(c => !/^(?:RMB|USD|CBM|KG|KGS|TON|LBS)$/i.test(c));

    if (airportCodes.length >= 2) {
      const routeMatch = text.match(/([A-Z]{3})[-\s]([A-Z]{3})/);
      const origin = routeMatch ? routeMatch[1] : airportCodes[0];
      const dest = routeMatch ? routeMatch[2] : airportCodes[1];

      const priceMatch = text.match(/(\d+\.?\d*)\s*(?:RMB|元)?\s*\/\s*(?:KG|CBM)/i);
      const cbmMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:CBM|立方)/i);
      const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:KG|公斤)/i);
      const dateMatch = text.match(/(\d+)\s*号起|(\d{1,2})[\/\.](\d{1,2})/);
      const timeWords = /周[一二三四五六日]|下周|起收|截关/.test(text);

      let validFrom = today;
      if (dateMatch) {
        const day = parseInt(dateMatch[1] || dateMatch[2]);
        if (day >= 1 && day <= 31) {
          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;
          validFrom = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        }
      }

      const warehouseName = origin + '-' + dest;

      results.push({
        region: origin + '-' + dest,
        warehouse_name: warehouseName,
        available_cbm: cbmMatch ? parseFloat(cbmMatch[1]) : 0,
        available_kg: kgMatch ? parseFloat(kgMatch[1]) : 0,
        price_per_cbm: undefined,
        price_per_kg: priceMatch ? parseFloat(priceMatch[1]) : undefined,
        currency: 'CNY',
        valid_from: validFrom,
        valid_to: getEndOfMonth(today),
        cargo_type: undefined,
        cargo_restrictions: timeWords ? '仓位充足' : undefined,
        notes: text.substring(0, 500),
      });
      return results;
    }

    results.push({
      region: '待确认',
      warehouse_name: '待确认',
      available_cbm: 0, available_kg: 0,
      currency: 'CNY',
      valid_from: today, valid_to: getEndOfMonth(today),
      notes: text.substring(0, 500),
    });
    return results;
  }

  // Split text by location boundaries into per-route segments
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    const nextPos = i < locations.length - 1 ? locations[i + 1].pos : text.length;
    const routeText = text.substring(loc.pos, nextPos).trim();

    // Parse data from route text
    const cbmMatch = routeText.match(/(\d+(?:\.\d+)?)\s*(?:CBM|立方|立方米)/i);
    const kgMatch = routeText.match(/(\d+(?:\.\d+)?)\s*(?:KG|公斤|千克)/i);
    const dateMatch = routeText.match(/最早\s*(\d+)\.(\d+)|(\d+)\.(\d+)/);
    const cargoTypeMatch = routeText.match(/(普货|电子产品|电子|服装|危险品|冷链|机械|设备|化工|大宗)/);

    // Extract conditions
    const notes: string[] = [];
    if (/仓位紧张|仓位紧/.test(routeText)) notes.push('仓位紧张');
    if (/仓位宽松/.test(routeText)) notes.push('仓位宽松');
    if (/直飞/.test(routeText)) notes.push('直飞');
    if (/随时/.test(routeText)) notes.push('随时可定');
    if (/头程/.test(routeText)) notes.push('头程');
    if (/月底/.test(routeText)) notes.push('最早月底');

    let validFrom = today;
    if (dateMatch) {
      const year = new Date().getFullYear();
      const m = dateMatch[1] ? parseInt(dateMatch[1]) : parseInt(dateMatch[3]);
      const d = dateMatch[2] ? parseInt(dateMatch[2]) : parseInt(dateMatch[4]);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        validFrom = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    } else if (/月底/.test(routeText)) {
      validFrom = getEndOfMonth(today);
    }

    // Extract airline code
    const airlineMatch = routeText.match(/(?:走|航司|航空)\s*([A-Z]{2})/);
    const warehouseName = airlineMatch
      ? `${loc.name}(${airlineMatch[1]})`
      : loc.name;

    results.push({
      region: loc.name,
      warehouse_name: warehouseName,
      available_cbm: cbmMatch ? parseFloat(cbmMatch[1]) : 0,
      available_kg: kgMatch ? parseFloat(kgMatch[1]) : 0,
      currency: 'CNY',
      valid_from: validFrom,
      valid_to: getEndOfMonth(today),
      cargo_type: cargoTypeMatch ? cargoTypeMatch[0] : undefined,
      cargo_restrictions: notes.length > 0 ? notes.join('；') : undefined,
      notes: notes.length > 0 ? notes.join('；') : routeText.substring(0, 300),
    });
  }

  return results;
}

function getEndOfMonth(dateStr: string): string {
  const d = new Date(dateStr);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return lastDay.toISOString().split('T')[0];
}

function normalizeRow(row: Record<string, unknown>, today: string, originalText?: string): ParsedCargoRow {
  let availableKg = parseFloat(String(row.available_kg || 0)) || 0;
  let pricePerKg = row.price_per_kg != null ? parseFloat(String(row.price_per_kg)) || undefined : undefined;
  let pricePerCbm = row.price_per_cbm != null ? parseFloat(String(row.price_per_cbm)) || undefined : undefined;

  // ── 安全校验 ──
  if (originalText) {
    // 检查原文是否有"XXX公斤以上/XXXKG以上"（最低起收量，不是价格）
    const kgThreshold = originalText.match(/(\d{2,})\s*(?:公斤以上|KG以上|公斤起|KG起)/);
    if (kgThreshold) {
      const thresholdKg = parseInt(kgThreshold[1]);
      // 如果 available_kg 没填或填的是这个阈值数字，就把 available_kg 改成阈值数字
      if (availableKg === 0 || availableKg === thresholdKg) {
        availableKg = thresholdKg;
      }
      // 如果 price_per_kg 恰好等于这个阈值数字，肯定是误解了 → 清空
      if (pricePerKg != null && pricePerKg === thresholdKg) {
        pricePerKg = undefined;
      }
    }

    // 原文出现"特价""优惠"但没出现具体单价数字（如"元/KG""RMB"等）→ 清空价格
    const hasPriceIndication = /特价|优惠/.test(originalText);
    const hasExplicitPrice = /(\d+(?:\.\d+)?)\s*(?:元|RMB|USD|CNY|￥|\$|€|\/KG|\/CBM)/i.test(originalText) ||
                             /[Pp]rice|[Pp]rice_per_kg/.test(originalText) ||
                             /\d+(?:\.\d+)?\s*\/\s*(?:KG|CBM)/i.test(originalText);
    if (hasPriceIndication && !hasExplicitPrice) {
      pricePerKg = undefined;
      pricePerCbm = undefined;
    }
  }

  // ── origin_port / dest_port ──
  let originPort = row.origin_port ? String(row.origin_port) : undefined;
  let destPort = row.dest_port ? String(row.dest_port) : undefined;
  if (!originPort || !destPort) {
    const r = String(row.region || '');
    // "广州-LAX" → origin=广州, dest=LAX
    const m = r.match(/^(.{2,6})[-\s](.{2,6})$/);
    if (m) {
      if (!originPort) originPort = m[1];
      if (!destPort) destPort = m[2];
    } else if (r && r !== '未知') {
      if (!originPort) originPort = r;
    }
    // 从原文提取目的港（IATA代码优先，无则用中文港口名）
    if (!destPort && originalText) {
      const codes = originalText.match(/[A-Z]{3}/g) || [];
      const valid = [...new Set(codes)].filter(c => !/^(?:CBM|KG|KGS|TON|LBS|RMB|USD|EUR|BUP)$/i.test(c));
      if (valid.length > 0) {
        destPort = valid[valid.length - 1];
      } else {
        // 没有IATA代码时，从原文找非始发港的已知国际港口名
        const portRegex = buildPortRegex();
        const ports = originalText.match(portRegex) || [];
        const uniquePorts = [...new Set(ports)];
        if (uniquePorts.length > 1) {
          // 取最后一个港口名为目的港（第一个是始发港）
          destPort = uniquePorts[uniquePorts.length - 1];
        } else if (uniquePorts.length === 1 && uniquePorts[0] !== originPort) {
          destPort = uniquePorts[0];
        }
      }
    }
  }

  return {
    region: String(row.region || originPort || '未知'),
    
    origin_port: originPort,
    dest_port: destPort,
    airline_code: row.airline_code ? String(row.airline_code).toUpperCase().substring(0, 10) : undefined,
    available_cbm: parseFloat(String(row.available_cbm || 0)) || 0,
    available_kg: availableKg,
    price_per_cbm: pricePerCbm,
    price_per_kg: pricePerKg,
    currency: String(row.currency || 'CNY'),
    valid_from: String(row.valid_from || today),
    valid_to: String(row.valid_to || getEndOfMonth(today)),
    cargo_type: row.cargo_type ? String(row.cargo_type) : undefined,
    
    contact_info: row.contact_info ? String(row.contact_info) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
  };
}

/**
 * Insert parsed rows into cargo_spaces table
 */
export async function insertParsedCargo(rows: ParsedCargoRow[], uploadedBy: string, rawMessageId?: string, category?: string, uploaderContact?: string): Promise<number> {
  const cargoRows = rows.map((row) => {
    // 如果传入了分类，在 notes 前加上分类标记
    let notes = row.notes || null;
    if (category && notes) {
      notes = `【${category}】${notes}`;
    } else if (category) {
      notes = `【${category}】`;
    }

    return {
      id: uuidv4(),
      uploaded_file_id: rawMessageId || null,
      region: row.region,
      warehouse_name: row.warehouse_name || row.origin_port || row.region || '',
      airline_code: row.airline_code || null,
      origin_port: row.origin_port || null,
      dest_port: row.dest_port || null,
      available_cbm: row.available_cbm,
      available_kg: row.available_kg,
      price_per_cbm: row.price_per_cbm || null,
      price_per_kg: row.price_per_kg || null,
      currency: row.currency || 'CNY',
      valid_from: row.valid_from,
      valid_to: row.valid_to,
      cargo_type: row.cargo_type || null,
      
      contact_info: uploaderContact || row.contact_info || null,
      notes,
      uploaded_by: uploadedBy || null,
      status: 'available',
    };
  });

  if (cargoRows.length === 0) return 0;

  await db('cargo_spaces').insert(cargoRows);
  return cargoRows.length;
}
