import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { cargoService } from '../services/cargo.service';
import { parseTextToCargo, insertParsedCargo } from '../services/textParser.service';
import { CargoStatus } from '../types';
import logger from '../utils/logger';
import { sendInquiryNotification } from '../services/email.service';
import { buildPortRegex, getCodeByCityName, getAllCityNamesByCode, isMainlandCity, isHongKongMacau, isForeignCity, isMainlandCode, CHINESE_COUNTRY_MAP, getAirportCodesByCountry, extractCityCodesFromEnglish } from '../data/airport-codes';
import { buildAirlineRegexString } from '../data/airline-codes';

// Build port matching regex once at module load
const PORT_REGEX = buildPortRegex();
const AIRLINE_REGEX = new RegExp('(?:^|[\\s,\\-－—，、（()]|[一-龥])(?:' + buildAirlineRegexString() + ')(?=[\\s,\\-－—，、）)]|$|[一-龥])');

/** 未登录用户脱敏：去掉联系方式 */
function sanitizeCargoItems(items: any[], isAuthenticated: boolean): any[] {
  if (isAuthenticated) return items;
  return items.map((item: any) => {
    const { contact_info, ...rest } = item;
    return rest;
  });
}

export const cargoController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        region: req.query.region as string | undefined,
        warehouse_name: req.query.warehouse_name as string | undefined,
        cargo_type: req.query.cargo_type as string | undefined,
        status: req.query.status as CargoStatus | undefined,
        valid_from: req.query.valid_from as string | undefined,
        valid_to: req.query.valid_to as string | undefined,
        min_cbm: req.query.min_cbm ? parseFloat(req.query.min_cbm as string) : undefined,
        max_cbm: req.query.max_cbm ? parseFloat(req.query.max_cbm as string) : undefined,
        min_kg: req.query.min_kg ? parseFloat(req.query.min_kg as string) : undefined,
        max_kg: req.query.max_kg ? parseFloat(req.query.max_kg as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sort_by: req.query.sort_by as string | undefined,
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc',
      };

      const result = await cargoService.list(filters);
      result.data = sanitizeCargoItems(result.data, !!req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async searchByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, keyword } = req.query;
      if (!category || !keyword) {
        return res.status(400).json({ error: '缺少分类或关键词', code: 'MISSING_PARAMS' });
      }

      // 空运出口同时匹配空运包税出口，海运出口同时匹配海运包税出口（避免前端重复调用导致重复推送）
      const searchCats = [category];
      if (category === '空运出口') searchCats.push('空运包税出口');
      if (category === '海运出口') searchCats.push('海运包税出口');

      // 将关键词拆分为单个词（空格/+/-/到/至），任一匹配即可
      const rawTerms = String(keyword).split(/[\s+\/\-－—]+|到|至/).filter(Boolean);
      // 对每个中文城市名，追加对应的 IATA 代码作为搜索词；反之亦然
      const expandedTerms: string[] = [];
      for (const t of rawTerms) {
        expandedTerms.push(t);
        // 中文名 → 代码，再将该代码的所有别名也加入搜索
        const code = getCodeByCityName(t);
        if (code) {
          expandedTerms.push(code);
          const aliases = getAllCityNamesByCode(code);
          for (const a of aliases) {
            if (a !== t) expandedTerms.push(a);
          }
        }
        // 代码 → 中文名（如 EHU → 鄂州，ICN → 首尔/汉城/仁川）
        if (/^[A-Z0-9]{3}$/i.test(t)) {
          const cities = getAllCityNamesByCode(t.toUpperCase());
          for (const city of cities) {
            expandedTerms.push(city);
          }
        }
        // 从包含文本中提取三字代码（如 "CGN件数3件" → "CGN"）
        const embeddedCode = t.match(/([A-Z0-9]{3})/);
        if (embeddedCode && embeddedCode[1] !== t) {
          const ec = embeddedCode[1];
          // 跳过纯数字代码（如"500"→从"500KG"提取的）
          if (!/^\d{3}$/.test(ec)) {
            expandedTerms.push(ec);
            const cities = getAllCityNamesByCode(ec.toUpperCase());
            for (const city of cities) {
              expandedTerms.push(city);
            }
          }
        }
      }

      // ── 中文国家名 → 该国所有机场代码（如"越南"→SGN,HAN,DAD...） ──
      for (const t of rawTerms) {
        const countryCodes = getAirportCodesByCountry(t);
        if (countryCodes.length > 0) {
          for (const c of countryCodes) {
            if (!expandedTerms.includes(c)) expandedTerms.push(c);
            const cities = getAllCityNamesByCode(c);
            for (const city of cities) {
              if (!expandedTerms.includes(city)) expandedTerms.push(city);
            }
          }
        }
      }

      // ── 从英文地址中提取城市名 → IATA 代码（如 "Los Angeles, CA 90001" → LAX） ──
      const engCodes = extractCityCodesFromEnglish(String(keyword));
      for (const ec of engCodes) {
        if (!expandedTerms.includes(ec)) expandedTerms.push(ec);
        const cities = getAllCityNamesByCode(ec);
        for (const city of cities) {
          if (!expandedTerms.includes(city)) expandedTerms.push(city);
        }
      }

      // 分类：大陆城市（含港澳）→ 始发港，国外城市 → 目的港
      const originTerms: string[] = [];
      const destTerms: string[] = [];
      const otherTerms: string[] = [];

      for (const t of expandedTerms) {
        const matched = rawTerms.find(r => t.startsWith(r) || r.startsWith(t));
        const cityName = matched || t;
        if (/^[A-Z0-9]{3}$/.test(t)) {
          // 过滤纯数字代码（如"500"→从"500KG"提取的）——它们不是有效的IATA代码
          if (/^\d{3}$/.test(t)) {
            if (!otherTerms.includes(t)) otherTerms.push(t);
          } else if (isMainlandCode(t) || t === 'HKG' || t === 'MFM') {
            if (!originTerms.includes(t)) originTerms.push(t);
          } else {
            if (!destTerms.includes(t)) destTerms.push(t);
          }
        } else if (isHongKongMacau(cityName) || isMainlandCity(cityName)) {
          if (!originTerms.includes(t)) originTerms.push(t);
        } else if (isForeignCity(cityName)) {
          if (!destTerms.includes(t)) destTerms.push(t);
        } else {
          if (!otherTerms.includes(t)) otherTerms.push(t);
        }
      }
      // 用 origin_port / dest_port 精确匹配

      let query = db('cargo_spaces')
        .where('status', 'available')
        .where('valid_to', '>=', db.raw("date('now')"))
        .where(function () {
          for (const sc of searchCats.slice(0, 3)) {
            this.orWhere('notes', 'like', `%【${sc}】%`);
          }
        });

      // 始发港条件 — 直查 origin_port
      const allOrigin = [...new Set([...originTerms, ...otherTerms])].slice(0, 3);
      if (allOrigin.length > 0) {
        query = query.andWhere(function () {
          for (const t of allOrigin) {
            this.orWhere('origin_port', 'like', `%${t}%`);
          }
        });
      }
      // 目的港条件 — 查 dest_port 或 notes（AI可能把目的港写在notes里）
      if (destTerms.length > 0) {
        query = query.andWhere(function () {
          for (const t of destTerms.slice(0, 3)) {
            this.orWhere('dest_port', 'like', `%${t}%`)
                .orWhere('notes', 'like', `%${t}%`);
          }
        });
      }

      const data = await query
        .select('id', 'region', 'origin_port', 'dest_port', 'warehouse_name', 'airline_code', 'notes', 'contact_info', 'uploaded_file_id', 'valid_from', 'valid_to', 'created_at')
        .orderBy('created_at', 'desc')
        .limit(30);

      // 不再需要二次过滤 — origin_port + dest_port 直查已经精确
      const filtered = data;

      // 按 origin_port + dest_port + airline_code 去重（保留不同航司的同一航线）
      const seen = new Set();
      const deduped = filtered.filter(item => {
        const key = (item.origin_port || '') + '|' + (item.dest_port || '') + '|' + (item.airline_code || '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // ── 批量注入企业认证状态 ──
      try {
        const companyNames = [...new Set(deduped.map((item: any) => {
          const first = item.contact_info?.split(' ')[0];
          return first && first.length > 1 ? first : null;
        }).filter(Boolean))];
        if (companyNames.length > 0) {
          const verifiedRows = await db('users')
            .whereIn('company_name', companyNames)
            .where('is_verified_company', 1)
            .select('company_name');
          const verifiedSet = new Set(verifiedRows.map((v: any) => v.company_name));
          for (const item of deduped) {
            const companyName = item.contact_info?.split(' ')[0];
            (item as any).is_verified_company = companyName && verifiedSet.has(companyName) ? true : false;
          }
        }
      } catch (e) {
        // 不影响主逻辑
      }

      // ── 注入信任信息（共同代理/推荐链/同事/评分/实名/入驻天数） ──
      const currentUserId = (req as any).user?.id;
      if (currentUserId) {
        try {
          const myCoopAgents = await db('cooperations').where({ forwarder_user_id: currentUserId, status: 'confirmed' }).select('agent_user_id');
          const myReferrer = await db('referrals').where({ referee_id: currentUserId }).select('referrer_id').first() as any;
          const myReferees = await db('referrals').where({ referrer_id: currentUserId }).select('referee_id');
          const currentUser = await db('users').where({ id: currentUserId }).first() as any;
          const myCompany = currentUser?.company_name || '';
          for (const item of deduped) {
            const companyName = item.contact_info?.split(' ')[0];
            if (!companyName) continue;
            const uploader = await db('raw_messages')
              .leftJoin('users', 'raw_messages.uploaded_by', 'users.id')
              .where('raw_messages.id', item.uploaded_file_id)
              .select('users.id as uploader_id', 'users.display_name', 'users.company_name', 'users.card_image', 'users.phone', 'users.created_at')
              .first() as any;
            if (!uploader?.uploader_id || uploader.uploader_id === currentUserId) continue;
            const trustHints: string[] = []; const mutualAgents: { name: string }[] = [];
            const uploaderCoops = await db('cooperations').where({ forwarder_user_id: uploader.uploader_id, status: 'confirmed' }).select('agent_user_id');
            const uploaderAgentIds = new Set(uploaderCoops.map((c: any) => c.agent_user_id));
            const sharedAgents = await db('users').whereIn('id', [...uploaderAgentIds].filter((id: string) => myCoopAgents.some((mc: any) => mc.agent_user_id === id))).select('display_name', 'company_name');
            for (const a of sharedAgents) { mutualAgents.push({ name: a.display_name || a.company_name }); trustHints.push('mutual_agent'); }
            if (myReferees?.some((r: any) => r.referee_id === uploader.uploader_id)) trustHints.push('referral:i_referred');
            if (myReferrer?.referrer_id === uploader.uploader_id) trustHints.push('referral:referred_me');
            if (myCompany && uploader.company_name && myCompany === uploader.company_name) trustHints.push('same_company');
            const uploaderReviews = await db('reviews').where({ reviewee_id: uploader.uploader_id }).select('rating');
            const reviewTotal = uploaderReviews.length;
            const avgRating = reviewTotal > 0 ? (uploaderReviews.reduce((s: number, r: any) => s + r.rating, 0) / reviewTotal).toFixed(1) : null;
            const uploaderCoopCount = await db('cooperations').where({ forwarder_user_id: uploader.uploader_id, status: 'confirmed' }).count('* as total').first() as any;
            const daysSinceReg = uploader.created_at ? Math.floor((Date.now() - new Date(uploader.created_at).getTime()) / 86400000) : 0;
            (item as any).trust_info = {
              hints: trustHints, mutual_agents: mutualAgents,
              uploader_name: uploader.display_name, uploader_company: uploader.company_name, uploader_id: uploader.uploader_id,
              has_card: !!uploader.card_image, has_phone: !!uploader.phone,
              days_since_reg: daysSinceReg,
              avg_rating: avgRating ? Number(avgRating) : null, review_count: reviewTotal,
              coop_count: Number(uploaderCoopCount?.total || 0),
            };
          }
        } catch (e) { /* 信任信息不影响主结果 */ }
      }

      // ── 检测5要素齐全（始发港+目的港+件数+重量+体积） ──
      const senderId = (req as any).user?.id;
      const senderDisplayName = (req as any).user?.display_name || '';

      // ── 统计浏览量（用户级去重：同一天同一用户只看一次） ──
      const viewIds = deduped.map((item: any) => item.id).filter(Boolean);
      if (viewIds.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        // 只对已登录用户去重
        if (senderId) {
          const viewedToday = await db('cargo_view_logs')
            .where('view_date', today)
            .whereIn('cargo_id', viewIds)
            .select('cargo_id');
          const viewedIds = new Set(viewedToday.map((v: any) => v.cargo_id));
          const newIds = viewIds.filter((id: string) => !viewedIds.has(id));
          if (newIds.length > 0) {
            await db("cargo_spaces").whereIn("id", newIds).increment("view_count", 1);
            await db('cargo_view_logs').insert(newIds.map((id: string) => ({ id: uuidv4(), cargo_id: id, view_date: today })));
          }
        } else {
          // 未登录用户仅记录日志，不增计数（防刷）
          await db('cargo_view_logs').insert(viewIds.map((id: string) => ({ id: uuidv4(), cargo_id: id, view_date: today }))).catch((e: any) => logger.error('视图日志写入失败:', e?.message));
        }
      }
      const has5Elements = senderId
        && /\d+\s*件/.test(keyword as string)
        && /\d+\s*(?:KG|kg|公斤)/.test(keyword as string)
        && /\d+\s*(?:CBM|立方)/.test(keyword as string)
        && originTerms.length > 0
        && destTerms.length > 0;

      const isAuth = !!req.user;
      res.json({
        data: sanitizeCargoItems(deduped, isAuth),
        total: deduped.length,
        push_message: has5Elements
          ? '✅ 您输入的信息非常精准，我们已经将您的需求推送至今日对应口岸发布此相关航线信息的货运代理的站内信与外部邮件，稍等他们会通过站内信与您取得联系（请在确认信息可靠后再进行微信或者电话联系）'
          : undefined,
      });
      // ── 搜索日志 ──
      try {
        const { v4 } = await import('uuid');
        await db('search_logs').insert({
          id: v4(),
          user_id: senderId || null,
          keyword: String(keyword || '').substring(0, 200),
          category: req.query.category as string || null,
          has_push: has5Elements || /\d+\s*(?:件|KG|CBM|kg|箱|吨)/.test(keyword as string),
        });
      } catch {}

      if (senderId && /\d+\s*(?:件|KG|CBM|kg|箱|吨)/.test(keyword as string)) {
        try {
          const kw = String(keyword);
          const category = req.query.category as string;

          // ── 空运出口/空运包税出口：提取始发港+目的港 → 推送给相关发布者 ──
          if (category === '空运出口' || category === '空运包税出口') {
            const codes = kw.match(/[A-Z0-9]{3}/g) || [];
            const chinesePorts = kw.match(PORT_REGEX) || [];
            let portKws = [...new Set([...codes, ...chinesePorts])];

            // 补充：中文国家名 → 该国所有机场代码（如"美国"→所有美国机场代码）
            const rawTerms = kw.split(/[\s+\/\-－—]+|到|至/).filter(Boolean);
            let countryCodes: string[] = [];
            for (const t of rawTerms) {
              const cc = getAirportCodesByCountry(t);
              countryCodes = [...countryCodes, ...cc];
            }

            // 补充：从英文地址中提取城市名 → IATA 代码（如 "Los Angeles" → LAX）
            const engCodes = extractCityCodesFromEnglish(kw);

            // ── 优先级排列匹配词 ──
            // 1级（精准）：英文地址匹配的具体机场   2级（兜底）：国家枢纽机场
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

            // 2级：直接提取的代码/城市名（不含国家展开的）
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

            // 3级（兜底）：国家展开的枢纽机场 — 无论英文地址是否匹配都补充
            // 因为洛杉矶(LAX)的货代也能做圣地亚哥(SAN)的货
            if (countryCodes.length > 0) {
              const HUBS = ['LAX','JFK','ORD','SFO','SEA','MIA','ATL','DFW','BOS','IAD','EWR','PHX','DEN','MSP','DTW','PHL','CLT','FLL','TPA','SAN','LAS','PDX','STL','HNL','ANC',
                'LHR','LGW','MAN','CDG','FRA','MUC','FCO','MXP','AMS','BRU','ZRH','GVA','MAD','BCN','LIS','CPH','ARN','OSL','HEL','DUB','VIE','PRG','BUD','WAW','IST',
                'NRT','HND','KIX','ICN','HKG','SIN','KUL','BKK','CGK','MNL','SGN','HAN','DEL','BOM','DAC','CMB','DXB','AUH','DOH','JED','RUH',
                'SYD','MEL','BNE','AKL','NBO','JNB','CPT','CAI','LOS','ADD',
                'GRU','GIG','EZE','SCL','LIM','BOG','MEX','PTY'];
              const hubMatch = countryCodes.filter(c => HUBS.includes(c));
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

            // 确保至少有始发港词
            if (portKws.length >= 2) {
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

              const seen = new Set<string>();
              for (const p of publishers) {
                if (p.id === senderId || seen.has(p.id)) continue;
                seen.add(p.id);
                const pubRow = await db('users').where({ id: p.id }).select('email','email_verified','notify_inquiry_email','notify_inquiry_site','display_name','company_name').first() as any;

                // 查该发布者匹配查询关键词的原始记录原文
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

                if (pubRow && pubRow.notify_inquiry_site !== 0) {
                  const { v4 } = await import('uuid');
                  const msgBody = `📢 有群友发布货物求购「${kw.substring(0, 50)}」

🔍 查询关键词：${kw.substring(0, 100)}`
                    + (matchedRaw ? `\n\n📌 您匹配到的推广原文：\n${matchedRaw}` : '')
                    + `\n\n━━━━━━━━━━━━━━━━━━━━\n\n请及时回复。`;
                  await db('messages').insert({
                    id: v4(), sender_id: senderId, receiver_id: p.id,
                    content: msgBody,
                    is_read: false,
                  });
                }
                // 发邮件通知发布者
                try {
                  if (pubRow && pubRow.email && pubRow.email_verified && pubRow.notify_inquiry_email !== 0) {
                    await sendInquiryNotification(pubRow.email, pubRow.display_name || pubRow.company_name, senderDisplayName, kw);
                  }
                } catch {}
              }
              if (seen.size > 0) logger.info(`需求推送: "${kw.substring(0, 30)}..." → ${seen.size} 位发布者`);
            }
          }

          // ── 海运出口/海运包税出口：提取始发港+目的港 → 推送给相关发布者 ──
          if (category === '海运出口' || category === '海运包税出口') {
            const codes = (kw.match(/\b[A-Z]{3}\b/g) || []).filter(c => !/^(?:CBM|KG|KGS|TON|LBS|RMB|USD|EUR|BUP)$/i.test(c));
            const chinesePorts = kw.match(PORT_REGEX) || [];
            const portKws = [...new Set([...codes, ...chinesePorts])];

            if (portKws.length >= 2) {
              // 取前两个作为始发港+目的港，并扩展别名
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

              const seen = new Set<string>();
              for (const p of publishers) {
                if (p.id === senderId || seen.has(p.id)) continue;
                seen.add(p.id);
                const pubRow = await db('users').where({ id: p.id }).select('email','email_verified','notify_inquiry_email','notify_inquiry_site','display_name','company_name').first() as any;
                // 查该发布者匹配查询关键词的原始记录原文
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

                if (pubRow && pubRow.notify_inquiry_site !== 0) {
                  const { v4 } = await import('uuid');
                  const msgBody = `📢 有群友发布海运需求「${kw.substring(0, 50)}」

🔍 查询关键词：${kw.substring(0, 100)}`
                    + (matchedRaw ? `\n\n📌 您匹配到的推广原文：\n${matchedRaw}` : '')
                    + `\n\n━━━━━━━━━━━━━━━━━━━━\n\n请及时报价回复。`;
                  await db('messages').insert({
                    id: v4(), sender_id: senderId, receiver_id: p.id,
                    content: msgBody,
                    is_read: false,
                  });
                }
                // 发邮件通知发布者
                try {
                  if (pubRow && pubRow.email && pubRow.email_verified && pubRow.notify_inquiry_email !== 0) {
                    await sendInquiryNotification(pubRow.email, pubRow.display_name || pubRow.company_name, senderDisplayName, kw);
                  }
                } catch {}
              }
              if (seen.size > 0) logger.info(`海运需求推送: "${kw.substring(0, 30)}..." → ${seen.size} 位发布者`);
            }
          }
        } catch (pushErr) {
          logger.error('需求推送失败:', pushErr);
        }
      }
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const cargo = await cargoService.getById(req.params.id);
      const sanitized = sanitizeCargoItems([cargo], !!req.user);
      res.json(sanitized[0] || cargo);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      // 所有权检查：只能操作自己的记录（checkOwnership 已包含存在性校验）
      const { cargo: existing, isOwner } = await cargoService.checkOwnership(req.params.id, req.user!.id);
      if (!existing) return res.status(404).json({ error: '记录不存在' });
      if (!isOwner) return res.status(403).json({ error: '只能操作自己的记录' });

      // 白名单：只允许更新哪些字段
      const allowedFields = ['region','warehouse_name','origin_port','dest_port','airline_code',
        'available_cbm','available_kg','price_per_cbm','price_per_kg','currency',
        'valid_from','valid_to','cargo_type','cargo_restrictions','contact_info','notes','status'];
      const updates: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      updates.updated_at = db.fn.now();

      const cargo = await cargoService.update(req.params.id, updates);
      res.json(cargo);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      // 所有权检查（checkOwnership 已包含存在性校验）
      const { cargo: existing, isOwner } = await cargoService.checkOwnership(req.params.id, req.user!.id);
      if (!existing) return res.status(404).json({ error: '记录不存在' });
      if (!isOwner) return res.status(403).json({ error: '只能操作自己的记录' });

      await cargoService.delete(req.params.id);
      res.json({ message: '删除成功' });
    } catch (err) {
      next(err);
    }
  },

  async stats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await cargoService.getStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },

  async parseText(req: Request, res: Response, next: NextFunction) {
    try {
      const { text } = req.body;
      const category = req.body.category || '普货推广';

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: '请输入货舱信息文本', code: 'EMPTY_TEXT' });
      }

      const userId = req.user?.id || 'system';

      // ── 获取录入人的公司名+姓名+手机号 ──
      const currentUser = await db('users').where({ id: userId }).first() as any;
      const uploaderInfo = [currentUser?.company_name, currentUser?.display_name, currentUser?.phone]
        .filter(Boolean)
        .join(' ');
      const contactInfo = uploaderInfo || undefined;

      // ── 同一天 + 同一管理员 + 相同文本 → 自动合并（不重复插入） ──
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const duplicate = await db('raw_messages')
        .where({ uploaded_by: userId, content: text.trim() })
        .where('created_at', '>=', todayStart.toISOString())
        .first();

      if (duplicate) {
        return res.json({
          message: '✅ 检测到重复输入，已自动合并（相同内容已在今天录入过）',
          rows: [],
          inserted: 0,
        });
      }

      // ── 空运出口：至少包含一个机场代码+货舱相关关键词（航班号可选，放宽验证便于录入推广信息）──
      if (category === '空运出口') {
        // 提取三字代码
        const codes: string[] = text.match(/[A-Z0-9]{3}/g) || [];
        // 提取中文港口名并映射为 IATA 代码（如 香港→HKG, 厦门→XMN, 汉城→ICN）
        const chinesePorts = text.match(PORT_REGEX) || [];
        for (const port of chinesePorts) {
          const code = getCodeByCityName(port);
          if (code && !codes.includes(code)) codes.push(code);
        }
        // 过滤纯数字代码（如"500"不是真实机场代码）
        const realCodes = codes.filter(c => !/^\d{3}$/.test(c));
        const hasAirportCode = realCodes.length >= 1;
        const hasAirline = AIRLINE_REGEX.test(text);
        const hasCargo = /CBM|KG|公斤|立方|吨|仓位|舱位|包舱|订舱|托盘|散箱|货机|大泡|电商|航班|包板|特价|收货|整板|超重|卡转|转运|固定|长期/i.test(text);
        if (!hasAirportCode || !hasCargo) {
          return res.json({
            message: '❌ 空运出口：至少需要包含机场代码（如 CDG/LHR/FRA 等）和货舱相关关键词！例如：CAN CZ SGN 仓位4号起',
            rows: [],
            inserted: 0,
          });
        }
      }

      // Extract codes as keywords
      const codeMatches = text.match(/[A-Z0-9]{2,3}/g) || [];
      const keywords = [...new Set(codeMatches.map(c => c.toUpperCase()))].join(',');

      // Parse text to structured data first
      const rows = await parseTextToCargo(text.trim());

      if (rows.length === 0) {
        return res.json({
          message: '未能从文本中解析出货舱信息，请检查文本格式后重试',
          rows: [],
          inserted: 0,
        });
      }

      // 解析成功后才保存原始记录（避免解析失败产生无法重试的死记录）
      const rawId = uuidv4();
      await db('raw_messages').insert({
        id: rawId,
        content: text.trim(),
        keywords,
        uploaded_by: userId,
        category,
      });

      // Insert into database (link to raw message)
      const inserted = await insertParsedCargo(rows, userId, rawId, category, contactInfo);

      res.json({
        message: `成功解析并入库 ${inserted} 条货舱记录`,
        rows,
        inserted,
      });
    } catch (err) {
      next(err);
    }
  },

  async myStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const currentUser = await db("users").where({ id: userId }).first() as any;
      const phone = currentUser?.phone;

      const myCargoIds = await db("cargo_spaces")
        .where(function () {
          if (phone) this.where("contact_info", "like", "%" + phone + "%");
          this.orWhere("uploaded_file_id", "in",
            db("raw_messages").where({ uploaded_by: userId }).select("id")
          );
        })
        .select("id", "origin_port", "dest_port", "airline_code", "view_count", "inquiry_count", "valid_from", "valid_to", "created_at", "notes")
        .orderBy("created_at", "desc")
        .limit(100) as any[];

      const totalViews = myCargoIds.reduce((sum: number, r: any) => sum + (r.view_count || 0), 0);
      const totalInquiries = myCargoIds.reduce((sum: number, r: any) => sum + (r.inquiry_count || 0), 0);
      const totalRecords = myCargoIds.length;
      const activeRecords = myCargoIds.filter((r: any) => r.valid_to && r.valid_to >= new Date().toISOString().split("T")[0]).length;
      const topByViews = [...myCargoIds].sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 10);

      // ── 近7天每日浏览量 ──
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const startDate = sevenDaysAgo.toISOString().split('T')[0];
      const ids = myCargoIds.map((r: any) => r.id);
      const dailyLogs = ids.length > 0 ? await db('cargo_view_logs')
        .whereIn('cargo_id', ids)
        .where('view_date', '>=', startDate)
        .select('view_date', db.raw('COUNT(*) as cnt'))
        .groupBy('view_date')
        .orderBy('view_date', 'asc') as any[] : [];

      const dailyViews: { date: string; views: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const log = dailyLogs.find((l: any) => l.view_date === dateStr);
        dailyViews.push({ date: dateStr, views: log ? Number(log.cnt) : 0 });
      }

      // ── 按航线维度分析 ──
      const routeStats = myCargoIds
        .filter((r: any) => r.origin_port || r.dest_port)
        .map((r: any) => ({
          route: (r.origin_port || '?') + ' → ' + (r.dest_port || '?'),
          airline: r.airline_code || '',
          views: r.view_count || 0,
          inquiries: r.inquiry_count || 0,
          conversion: r.view_count && r.view_count > 0
            ? Math.round(((r.inquiry_count || 0) / r.view_count) * 100) + '%'
            : '0%',
          status: r.valid_to >= new Date().toISOString().split('T')[0] ? '有效' : '已过期',
        }));

      res.json({
        totalRecords, activeRecords, totalViews, totalInquiries,
        topByViews: topByViews.map((r: any) => ({
          route: (r.origin_port || '?') + ' → ' + (r.dest_port || '?'),
          airline: r.airline_code,
          views: r.view_count || 0,
          inquiries: r.inquiry_count || 0,
        })),
        dailyViews,
        routeStats,
      });
    } catch (err) { next(err); }
  },

  async trending(_req: Request, res: Response, next: NextFunction) {
    try {
      // 本周热门搜索 Top 10
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split("T")[0];

      const hotSearches = await db("search_logs")
        .where("created_at", ">=", startDate + " 00:00:00")
        .whereNotNull("keyword")
        .select("keyword", db.raw("COUNT(*) as cnt"))
        .groupBy("keyword")
        .orderBy("cnt", "desc")
        .limit(10) as any[];

      // 最新推广信息 10条（带发布者新手标识）
      const latest = await db("cargo_spaces")
        .leftJoin("raw_messages", "cargo_spaces.uploaded_file_id", "raw_messages.id")
        .leftJoin("users", "raw_messages.uploaded_by", "users.id")
        .where("cargo_spaces.status", "available")
        .whereNotNull("cargo_spaces.origin_port")
        .select(
          "cargo_spaces.id", "cargo_spaces.origin_port", "cargo_spaces.dest_port",
          "cargo_spaces.airline_code", "cargo_spaces.notes", "cargo_spaces.contact_info",
          "cargo_spaces.created_at", "cargo_spaces.valid_from", "cargo_spaces.valid_to",
          "users.is_newbie",
        )
        .orderBy("cargo_spaces.created_at", "desc")
        .limit(10) as any[];

      // 对未登录用户：只显示公司名（contact_info 的第一个字段），不显示姓名手机号
      const sanitized = latest.map((item: any) => {
        const { contact_info, is_newbie, ...rest } = item;
        let company_name = null;
        if (contact_info) {
          const parts = contact_info.split(' ');
          company_name = parts[0] || null;
        }
        return { ...rest, company_name, is_newbie: is_newbie ? true : false };
      });

      res.json({ hotSearches, latest: sanitized });
    } catch (err) { next(err); }
  },

  /** 返回所有用户的有效推广信息（用于轮播展示） */
  async myAirItems(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await db("cargo_spaces")
        .where("status", "available")
        .where("valid_to", ">=", db.raw("date('now')"))
        .select("id", "region", "origin_port", "dest_port", "airline_code", "notes", "contact_info", "created_at", "valid_from", "valid_to")
        .orderBy("created_at", "desc")
        .limit(50) as any[];

      const isAuth = !!req.user;
      res.json({ data: isAuth ? items : items.map((i: any) => { const { contact_info, ...rest } = i; return rest; }) });
    } catch (err) { next(err); }
  },

  /** 导出报价单（XLSX） */
  async exportQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const cargo = await db('cargo_spaces').where({ id: req.params.id }).first() as any;
      if (!cargo) return res.status(404).json({ error: '未找到该货舱记录' });

      // 获取用户信息
      let companyName = '';
      let userName = '';
      let userPhone = '';
      if (cargo.contact_info) {
        const parts = cargo.contact_info.split(' ');
        companyName = parts[0] || '';
        userName = parts[1] || '';
        userPhone = parts[2] || '';
      }

      const XLSX = require('xlsx');
      const wb = XLSX.utils.book_new();

      const quoteData = [
        ['国际物流报价单 / Freight Quote'],
        [],
        ['报价日期', new Date().toLocaleDateString('zh-CN')],
        ['有效期', cargo.valid_from ? `${cargo.valid_from} ~ ${cargo.valid_to || ''}` : ''],
        ['航线', cargo.region || ''],
        ['始发港', cargo.origin_port || ''],
        ['目的港', cargo.dest_port || ''],
        ['航空公司', cargo.airline_code || ''],
        ['可配舱位', `${cargo.available_cbm || 0} CBM / ${cargo.available_kg || 0} KG`],
        ['价格', cargo.price_per_cbm ? `${cargo.price_per_cbm}/CBM` : '', cargo.price_per_kg ? `${cargo.price_per_kg}/KG` : ''],
        ['币种', cargo.currency || 'CNY'],
        ['货物类型', cargo.cargo_type || '普货'],
        ['备注/限制', cargo.notes || ''],
        [],
        ['报价方', companyName],
        ['联系人', userName],
        ['联系电话', userPhone],
        [],
        ['说明：本报价单仅供参考，实际价格以确认为准'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(quoteData);
      ws['!cols'] = [{ wch: 15 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, ws, '报价单');

      const filename = `报价单_${cargo.origin_port || '未知'}_${cargo.dest_port || '未知'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.send(buf);
    } catch (err) { next(err); }
  },

  /** 批量导入运价（支持 API Key 或 JWT 认证） */
  async batchImport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: '未认证' });

      const { items, mode } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: '请提供 items 数组' });
      }

      if (items.length > 5000) {
        return res.status(400).json({ error: '单次最多导入5000条' });
      }

      const requiredFields = ['origin_port', 'dest_port', 'valid_from', 'valid_to'];
      const errors: { row: number; field: string; reason: string }[] = [];
      const validItems: any[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNum = i + 1;
        let rowOk = true;

        for (const field of requiredFields) {
          if (!item[field] || String(item[field]).trim() === '') {
            errors.push({ row: rowNum, field, reason: `${field} 不能为空` });
            rowOk = false;
          }
        }

        if (item.price_per_kg !== undefined && item.price_per_kg !== null && Number(item.price_per_kg) < 0) {
          errors.push({ row: rowNum, field: 'price_per_kg', reason: '价格不能为负数' });
          rowOk = false;
        }
        if (item.price_per_cbm !== undefined && item.price_per_cbm !== null && Number(item.price_per_cbm) < 0) {
          errors.push({ row: rowNum, field: 'price_per_cbm', reason: '价格不能为负数' });
          rowOk = false;
        }

        if (item.valid_from && item.valid_to && item.valid_from > item.valid_to) {
          errors.push({ row: rowNum, field: 'valid_to', reason: '有效期结束不能早于开始' });
          rowOk = false;
        }

        if (rowOk) {
          let notes = item.notes || '';
          if (item.cargo_type) {
            const catMap: Record<string, string> = {
              '空运': '【空运出口】', '海运': '【海运出口】',
              '快递': '【快递出口】', '陆运': '【陆运出口】',
            };
            const matched = Object.entries(catMap).find(([k]) => item.cargo_type.includes(k));
            if (matched && !notes.includes(matched[1])) {
              notes = notes ? `${matched[1]} ${notes}` : matched[1];
            }
          }

          validItems.push({
            id: uuidv4(),
            region: item.dest_port || item.region || '',
            warehouse_name: item.warehouse_name || '',
            origin_port: item.origin_port || '',
            dest_port: item.dest_port || '',
            airline_code: item.airline_code || '',
            available_cbm: Number(item.available_cbm || 0),
            available_kg: Number(item.available_kg || 0),
            price_per_cbm: item.price_per_cbm !== undefined ? Number(item.price_per_cbm) : null,
            price_per_kg: item.price_per_kg !== undefined ? Number(item.price_per_kg) : null,
            currency: item.currency || 'CNY',
            valid_from: item.valid_from,
            valid_to: item.valid_to,
            cargo_type: item.cargo_type || '',
            cargo_restrictions: item.cargo_restrictions || null,
            contact_info: item.contact_info || null,
            notes,
            status: 'available',
            uploaded_file_id: null,
            view_count: 0,
            inquiry_count: 0,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          });
        }
      }

      if (validItems.length === 0) {
        return res.status(400).json({ imported: 0, errors, message: '所有数据校验失败' });
      }

      // 全量替换模式
      if (mode === 'replace') {
        const userCargoIds = await db('cargo_spaces')
          .leftJoin('uploaded_files', 'cargo_spaces.uploaded_file_id', 'uploaded_files.id')
          .leftJoin('raw_messages', 'cargo_spaces.uploaded_file_id', 'raw_messages.id')
          .where(function (this: any) {
            this.where('uploaded_files.uploaded_by', userId)
              .orWhere('raw_messages.uploaded_by', userId);
          })
          .select('cargo_spaces.id') as any[];

        for (const c of userCargoIds) {
          await db('cargo_spaces').where({ id: c.id }).delete();
        }
      }

      // 批量插入
      const batchSize = 100;
      for (let i = 0; i < validItems.length; i += batchSize) {
        const batch = validItems.slice(i, i + batchSize);
        await db('cargo_spaces').insert(batch);
      }

      res.json({
        message: `成功导入 ${validItems.length} 条运价记录`,
        imported: validItems.length,
        total: items.length,
        errors: errors.length > 0 ? errors : undefined,
        mode: mode || 'append',
      });
    } catch (err) { next(err); }
  },
};
