import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../utils/logger';
import { sendInquiryNotification } from './email.service';
import { getAirportCodesByCountry, getAllCityNamesByCode, extractCityCodesFromEnglish } from '../data/airport-codes';

/** 全球主要枢纽机场代码 */
const HUBS = [
  'LAX','JFK','ORD','SFO','SEA','MIA','ATL','DFW','BOS','IAD','EWR','PHX','DEN','MSP','DTW','PHL','CLT','FLL','TPA','SAN','LAS','PDX','STL','HNL','ANC',
  'LHR','LGW','MAN','CDG','FRA','MUC','FCO','MXP','AMS','BRU','ZRH','GVA','MAD','BCN','LIS','CPH','ARN','OSL','HEL','DUB','VIE','PRG','BUD','WAW','IST',
  'NRT','HND','KIX','ICN','HKG','SIN','KUL','BKK','CGK','MNL','SGN','HAN','DEL','BOM','DAC','CMB','DXB','AUH','DOH','JED','RUH',
  'SYD','MEL','BNE','AKL','NBO','JNB','CPT','CAI','LOS','ADD',
  'GRU','GIG','EZE','SCL','LIM','BOG','MEX','PTY',
];

/**
 * 检查搜索关键词是否包含5要素：始发港+目的港+件数+重量+体积
 */
export function hasFiveElements(
  keyword: string,
  originTerms: string[],
  destTerms: string[],
): boolean {
  return (
    /\d+\s*件/.test(keyword) &&
    /\d+\s*(?:KG|kg|公斤)/.test(keyword) &&
    /\d+\s*(?:CBM|立方)/.test(keyword) &&
    originTerms.length > 0 &&
    destTerms.length > 0
  );
}

/**
 * 空运出口需求推送
 * 根据关键词中的始发港+目的港，匹配相关发布者并推送站内信+邮件
 */
export async function pushAirInquiry(
  keyword: string,
  category: string,
  portRegex: RegExp,
  senderId: string,
  senderDisplayName: string,
  attachmentPath?: string,
): Promise<number> {
  const kw = String(keyword);
  const codes = kw.match(/[A-Z0-9]{3}/g) || [];
  const chinesePorts = kw.match(portRegex) || [];
  let portKws = [...new Set([...codes, ...chinesePorts])];

  // 补充：中文国家名 → 该国所有机场代码
  const rawTerms = kw.split(/[\s+\/\-－—]+|到|至/).filter(Boolean);
  let countryCodes: string[] = [];
  for (const t of rawTerms) {
    const cc = getAirportCodesByCountry(t);
    countryCodes = [...countryCodes, ...cc];
  }

  // 从英文地址中提取城市名 → IATA 代码
  const engCodes = extractCityCodesFromEnglish(kw);

  let matchTerms: string[] = [];

  // 1级：英文地址匹配的机场（精准匹配）
  if (engCodes.length > 0) {
    matchTerms.push(...engCodes);
    for (const ec of engCodes) {
      const cities = getAllCityNamesByCode(ec);
      for (const c of cities) {
        if (!matchTerms.includes(c)) matchTerms.push(c);
      }
    }
  }

  // 2级：直接提取的代码/城市名
  for (const p of portKws) {
    if (/^\d{3}$/.test(p)) continue;
    if (matchTerms.includes(p)) continue;
    if (/^[A-Z0-9]{3}$/.test(p) && countryCodes.includes(p)) continue;
    matchTerms.push(p);
    if (/^[A-Z0-9]{3}$/.test(p)) {
      const cities = getAllCityNamesByCode(p);
      for (const c of cities) {
        if (!matchTerms.includes(c)) matchTerms.push(c);
      }
    }
  }

  // 3级（兜底）：国家展开的枢纽机场
  if (countryCodes.length > 0) {
    const hubMatch = countryCodes.filter((c) => HUBS.includes(c));
    const fallbackHubs = hubMatch.length > 0 ? hubMatch : countryCodes.slice(0, 5);
    for (const h of fallbackHubs) {
      if (matchTerms.includes(h)) continue;
      matchTerms.push(h);
      const cities = getAllCityNamesByCode(h);
      for (const c of cities) {
        if (!matchTerms.includes(c)) matchTerms.push(c);
      }
    }
  }

  if (portKws.length < 2) return 0;

  const finalTerms = matchTerms.slice(0, 10);

  const publishers = await db('raw_messages')
    .leftJoin('users', 'raw_messages.uploaded_by', 'users.id')
    .where(function () {
      for (const p of finalTerms) {
        this.orWhere('raw_messages.content', 'like', `%${p}%`);
      }
    })
    .whereNotNull('users.id')
    .select('users.id')
    .distinct()
    .limit(20);

  let sentCount = 0;
  const seen = new Set<string>();

  for (const p of publishers) {
    if (p.id === senderId || seen.has(p.id)) continue;
    seen.add(p.id);

    const pubRow = await db('users')
      .where({ id: p.id })
      .select(
        'email',
        'email_verified',
        'notify_inquiry_email',
        'notify_inquiry_site',
        'display_name',
        'company_name',
      )
      .first() as any;

    // 查匹配原文
    let matchedRaw = '';
    try {
      const matched = await db('raw_messages')
        .where('uploaded_by', p.id)
        .where(function () {
          for (const t of finalTerms.slice(0, 5)) {
            this.orWhere('content', 'like', `%${t}%`);
          }
        })
        .orderBy('created_at', 'desc')
        .first();
      if (matched) matchedRaw = (matched as any).content.substring(0, 300);
    } catch {}

    // 站内信推送（始终发送）
    if (pubRow) {
      const msgBody =
        `🎯 有客户在社区搜索「${kw.substring(0, 50)}」并匹配到了您的舱位\n\n` +
        `🔍 客户查询：${kw.substring(0, 100)}` +
        (matchedRaw ? `\n\n📌 您匹配到的推广原文：\n${matchedRaw}` : '') +
        (attachmentPath ? `\n\n📎 附箱单/文件：https://123cargo123.com/api/uploads/${attachmentPath.replace(/^uploads[\\/]/, '')}` : '') +
        `\n\n━━━━━━━━━━━━━━━━━━━━\n\n请及时回复。`;

      await db('messages').insert({
        id: uuidv4(),
        sender_id: senderId,
        receiver_id: p.id,
        content: msgBody,
        is_read: false,
      });
    }

    // 邮件通知（始终发送，货代白天不看站内信）
    try {
      if (pubRow && pubRow.email && pubRow.email_verified) {
        await sendInquiryNotification(
          pubRow.email,
          pubRow.display_name || pubRow.company_name,
          senderDisplayName,
          kw,
          'zh',
          attachmentPath,
        );
      }
    } catch {}

    sentCount++;
  }

  // 公共邮箱推送
  try {
    await sendInquiryNotification('express@tiangaocargo.com', '公共询价通知', senderDisplayName, kw, 'zh', attachmentPath);
  } catch {}

  return sentCount;
}

/**
 * 海运出口需求推送
 */
export async function pushSeaInquiry(
  keyword: string,
  portRegex: RegExp,
  senderId: string,
  senderDisplayName: string,
  attachmentPath?: string,
): Promise<number> {
  const kw = String(keyword);
  const codes = (kw.match(/\b[A-Z]{3}\b/g) || []).filter(
    (c) => !/^(?:CBM|KG|KGS|TON|LBS|RMB|USD|EUR|BUP)$/i.test(c),
  );
  const chinesePorts = kw.match(portRegex) || [];
  const portKws = [...new Set([...codes, ...chinesePorts])];

  if (portKws.length < 2) return 0;

  const [origin, dest] = portKws.slice(0, 2);
  const expandedOrigin: string[] = [origin];
  const expandedDest: string[] = [dest];

  if (/^[A-Z]{3}$/.test(origin)) {
    const cities = getAllCityNamesByCode(origin);
    for (const c of cities) if (!expandedOrigin.includes(c)) expandedOrigin.push(c);
  }
  if (/^[A-Z]{3}$/.test(dest)) {
    const cities = getAllCityNamesByCode(dest);
    for (const c of cities) if (!expandedDest.includes(c)) expandedDest.push(c);
  }

  const publishers = await db('raw_messages')
    .leftJoin('users', 'raw_messages.uploaded_by', 'users.id')
    .where(function () {
      this.andWhere(function () {
        for (const o of expandedOrigin) this.orWhere('raw_messages.content', 'like', `%${o}%`);
      }).andWhere(function () {
        for (const d of expandedDest) this.orWhere('raw_messages.content', 'like', `%${d}%`);
      });
    })
    .whereNotNull('users.id')
    .select('users.id')
    .distinct()
    .limit(20);

  let sentCount = 0;
  const seen = new Set<string>();

  for (const p of publishers) {
    if (p.id === senderId || seen.has(p.id)) continue;
    seen.add(p.id);

    const pubRow = await db('users')
      .where({ id: p.id })
      .select(
        'email',
        'email_verified',
        'notify_inquiry_email',
        'notify_inquiry_site',
        'display_name',
        'company_name',
      )
      .first() as any;

    // 查匹配原文
    let matchedRaw = '';
    try {
      const matched = await db('raw_messages')
        .where('uploaded_by', p.id)
        .where(function () {
          for (const t of [...expandedOrigin, ...expandedDest].slice(0, 5)) {
            this.orWhere('content', 'like', `%${t}%`);
          }
        })
        .orderBy('created_at', 'desc')
        .first();
      if (matched) matchedRaw = (matched as any).content.substring(0, 300);
    } catch {}

    // 站内信推送（始终发送）
    if (pubRow) {
      const msgBody =
        `🎯 有客户在社区搜索「${kw.substring(0, 50)}」并匹配到了您的舱位\n\n` +
        `🔍 客户查询：${kw.substring(0, 100)}` +
        (matchedRaw ? `\n\n📌 您匹配到的推广原文：\n${matchedRaw}` : '') +
        (attachmentPath ? `\n\n📎 附箱单/文件：https://123cargo123.com/api/uploads/${attachmentPath.replace(/^uploads[\\/]/, '')}` : '') +
        `\n\n━━━━━━━━━━━━━━━━━━━━\n\n请及时报价回复。`;

      await db('messages').insert({
        id: uuidv4(),
        sender_id: senderId,
        receiver_id: p.id,
        content: msgBody,
        is_read: false,
      });
    }

    // 邮件通知（始终发送，货代白天不看站内信）
    try {
      if (pubRow && pubRow.email && pubRow.email_verified) {
        await sendInquiryNotification(
          pubRow.email,
          pubRow.display_name || pubRow.company_name,
          senderDisplayName,
          kw,
          'zh',
          attachmentPath,
        );
      }
    } catch {}

    sentCount++;
  }

  // 公共邮箱推送
  try {
    await sendInquiryNotification('express@tiangaocargo.com', '公共询价通知', senderDisplayName, kw, 'zh', attachmentPath);
  } catch {}

  return sentCount;
}
