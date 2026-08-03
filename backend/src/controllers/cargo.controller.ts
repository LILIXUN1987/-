import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { cargoService } from '../services/cargo.service';
import { parseTextToCargo, insertParsedCargo } from '../services/textParser.service';
import { CargoStatus } from '../types';
import logger from '../utils/logger';
import { env } from '../config/env';
import { buildPortRegex, getCodeByCityName, getAllCityNamesByCode, isMainlandCity, isHongKongMacau, isForeignCity, isMainlandCode, getAirportCodesByCountry, extractCityCodesFromEnglish } from '../data/airport-codes';
import { buildAirlineRegexString } from '../data/airline-codes';
import { injectTrustInfo } from '../services/trust.service';
import { pushAirInquiry, pushSeaInquiry, hasFiveElements } from '../services/inquiryPush.service';

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
      // 支持 GET（JSON query）和 POST（FormData + 文件）
      const category = (req.query.category || req.body.category) as string;
      const keyword = (req.query.keyword || req.body.keyword) as string;
      const attachedFile = req.file; // 箱单/文件附件
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

      // ── 综合加权排序（精准度 0.5 + 认证 0.2 + 信用 0.2 + 新鲜度 0.1）──
      const now = Date.now();
      for (const item of deduped) {
        let precisionScore = 0;
        // 精准度：origin_term 匹配 origin_port 或 expanded term 出现在 port 字段中
        const op = (item.origin_port || '').toLowerCase();
        const dp = (item.dest_port || '').toLowerCase();
        for (const t of originTerms) {
          if (op === t.toLowerCase()) { precisionScore += 0.3; break; }
          else if (op.includes(t.toLowerCase())) { precisionScore += 0.2; break; }
        }
        for (const t of destTerms) {
          if (dp === t.toLowerCase()) { precisionScore += 0.3; break; }
          else if (dp.includes(t.toLowerCase())) { precisionScore += 0.2; break; }
        }
        precisionScore = Math.min(precisionScore, 0.5);

        // 新鲜度：基于 created_at
        const ageDays = item.created_at ? (now - new Date(item.created_at).getTime()) / 86400000 : 30;
        let freshnessScore = 0;
        if (ageDays <= 1) freshnessScore = 0.1;
        else if (ageDays <= 3) freshnessScore = 0.08;
        else if (ageDays <= 7) freshnessScore = 0.05;
        else if (ageDays <= 14) freshnessScore = 0.03;
        else freshnessScore = 0.01;

        // 认证分 + 信用分（后续注入后更新）
        (item as any)._precision = precisionScore;
        (item as any)._freshness = freshnessScore;
        (item as any)._rankScore = precisionScore + freshnessScore; // 临时，后面补充
      }

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
          await injectTrustInfo(deduped, currentUserId);
        } catch (e) { /* 信任信息不影响主结果 */ }
      }

      // ── 最终加权排序：精准0.5 + 认证0.2 + 信用0.2 + 新鲜0.1 ──
      for (const item of deduped) {
        const precision = (item as any)._precision || 0;
        const freshness = (item as any)._freshness || 0;
        const verified = (item as any).is_verified_company ? 0.2 : 0;
        const trust = (item as any).trust_info;
        const creditNorm = trust?.avg_rating
          ? Math.min((trust.avg_rating / 5) * 0.2, 0.2)
          : 0.1; // 无评分给基础0.1
        (item as any)._rankScore = precision + verified + creditNorm + freshness;
      }
      // 按综合得分降序排列
      deduped.sort((a: any, b: any) => (b._rankScore || 0) - (a._rankScore || 0));

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

      // ── 通知舱位来源公司（管理员代发时，让注册公司感知到活跃度） ──
      if (deduped.length > 0 && senderId) {
        try {
          const sourceNotes = deduped
            .map((item: any) => item.notes || '')
            .filter((n: string) => n.includes('【来源：'));
          if (sourceNotes.length > 0) {
            const allNames = new Set<string>();
            for (const note of sourceNotes) {
              const m = note.match(/【来源：(.+?)】/);
              if (m) m[1].split('、').forEach((n: string) => allNames.add(n.trim()));
            }
            const notified = new Set<string>();
            for (const companyName of allNames) {
              const targetUser = await db('users')
                .where('company_name', companyName)
                .where('status', 'approved')
                .first() as any;
              if (targetUser && !notified.has(targetUser.id) && targetUser.id !== senderId) {
                notified.add(targetUser.id);
                await db('messages').insert({
                  id: uuidv4(), sender_id: senderId, receiver_id: targetUser.id,
                  content: `🎯 有客户在社区「${req.query.category || '查询'}」搜索，匹配到了您的舱位：\n\n🔍 客户查询：${String(keyword).substring(0, 150)}\n\n━━━━━━━━━━━━━━━━━━━━\n💡 此舱位由社区管理员代为您发布。登录即可查看和回复询价，客户在等您报价！`,
                  is_read: false, created_at: new Date().toISOString(),
                }).catch(() => {});
                if (targetUser.email && targetUser.email_verified) {
                  try {
                    const { sendInquiryNotification } = await import('../services/email.service');
                    await sendInquiryNotification(targetUser.email, targetUser.display_name || companyName, senderDisplayName || '查询者', String(keyword).substring(0, 200));
                  } catch {}
                }
              }
            }
            if (notified.size > 0) logger.info(`来源公司通知: ${notified.size} 家 → "${String(keyword).substring(0, 30)}..."`);
          }
        } catch {}
      }

      const isAuth = !!req.user;
      res.json({
        data: sanitizeCargoItems(deduped, isAuth),
        total: deduped.length,
        push_message: has5Elements
          ? '✅ 您输入的信息非常精准，我们已经将您的需求推送至今日对应口岸发布此相关航线信息的货运代理的站内信与外部邮件，稍等他们会通过站内信与您取得联系（请在确认信息可靠后再进行微信或者电话联系）'
          + (attachedFile ? '\n📎 已附带箱单/文件，发布者将收到附件下载链接' : '')
          : (attachedFile ? '📎 已附带箱单/文件' : undefined),
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

      // ── 零结果时记录需求，后续有人发布匹配舱位时反向通知 ──
      if (deduped.length === 0 && senderId && String(keyword).length >= 2) {
        try {
          const od = originTerms[0] || '';
          const dd = destTerms[0] || '';
          await db('demand_records').insert({
            id: uuidv4(),
            user_id: senderId,
            keyword: String(keyword).substring(0, 200),
            category: req.query.category as string || null,
            origin_port: od.substring(0, 50),
            dest_port: dd.substring(0, 50),
            created_at: new Date().toISOString(),
          });
        } catch {}
      }

      if (senderId && /\d+\s*(?:件|KG|CBM|kg|箱|吨)/.test(keyword as string)) {
        try {
          const category = req.query.category as string;
          let pushedCount = 0;
          const filePath = attachedFile?.path;

          if (category === '空运出口' || category === '空运包税出口') {
            pushedCount = await pushAirInquiry(keyword as string, category, PORT_REGEX, senderId, senderDisplayName, filePath);
            if (pushedCount > 0) logger.info(`需求推送: "${String(keyword).substring(0, 30)}..." → ${pushedCount} 位发布者`);
          }

          if (category === '海运出口' || category === '海运包税出口') {
            pushedCount = await pushSeaInquiry(keyword as string, PORT_REGEX, senderId, senderDisplayName, filePath);
            if (pushedCount > 0) logger.info(`海运需求推送: "${String(keyword).substring(0, 30)}..." → ${pushedCount} 位发布者`);
          }

          // ── 零匹配结果 → 只发 express 邮箱，存入需求看板 ──
          if (pushedCount === 0 && deduped.length === 0) {
            try { const { sendInquiryNotification } = await import('../services/email.service'); await sendInquiryNotification('express@tiangaocargo.com', '未匹配询价', senderDisplayName, keyword as string); } catch {}
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
      const { text, source_companies, source_company_ids, auto_assign, auto_region } = req.body;
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

      // ── 查重：同一个人近30天已发布完全相同的航线+价格 → 提示已有 ──
      if (userId !== 'system') {
        for (const row of rows) {
          const dupQuery = db('cargo_spaces')
            .where('uploaded_by', userId);
          if (row.origin_port) dupQuery.where('origin_port', row.origin_port);
          if (row.dest_port) dupQuery.where('dest_port', row.dest_port);
          if (row.airline_code) dupQuery.where('airline_code', row.airline_code);
          if (row.price_per_cbm) dupQuery.where('price_per_cbm', row.price_per_cbm);
          if (row.price_per_kg) dupQuery.where('price_per_kg', row.price_per_kg);

          const existing = await dupQuery.where('created_at', '>=', db.raw("datetime('now', '-30 days')")).first();
          if (existing) {
            const routeLabel = [row.origin_port, row.dest_port].filter(Boolean).join('→') || row.region || '';
            const priceLabel = row.price_per_cbm ? `¥${row.price_per_cbm}/CBM` : row.price_per_kg ? `¥${row.price_per_kg}/KG` : '';
            return res.json({
              message: `⚠️ 系统已存在相同的推广：${routeLabel} ${row.airline_code||''} ${priceLabel}（30天内已发布过，请勿重复录入）`,
              rows: [],
              inserted: 0,
            });
          }
        }
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

      // ── 自动分配50家货代（优先业务类型 + 省份筛选） ──
      let srcCompanies: string[] = Array.isArray(source_companies) ? source_companies : [];
      if (auto_assign === true || auto_assign === 'true') {
        const catKey = (category || '').replace('包税', '').replace('出口', '').replace('进口', '');
        const bizKeywords: Record<string, string> = {
          '空运': '空运', '海运': '海运', '陆运': '陆运',
          '快递': '快递', '进口清关': '进口清关', '双清': '双清包税',
        };
        const matchKeyword = bizKeywords[catKey] || '';
        const region = (auto_region || '') as string;

        // 省份关键词映射（公司名包含这些关键词）
        const regionMap: Record<string, string[]> = {
          '上海': ['上海'],
          '北京': ['北京'],
          '广深': ['广州', '深圳'],
          '新疆': ['新疆'],
          '其他': [], // 排除上海/北京/广深/新疆
        };

        // 省份筛选
        const allFwds = await db('users')
          .where({ role: 'forwarder', status: 'approved' })
          .whereNotNull('company_name')
          .select('company_name', 'business_scope') as any[];

        let pool = allFwds;
        if (region && regionMap[region]) {
          const keys = regionMap[region];
          pool = allFwds.filter(f => keys.some(k => (f.company_name || '').includes(k)));
        } else if (region === '其他') {
          const excludeKeys = ['上海', '北京', '广州', '深圳', '新疆'];
          pool = allFwds.filter(f => !excludeKeys.some(k => (f.company_name || '').includes(k)));
        }

        // 业务类型优先
        let matched = pool.filter(f => matchKeyword && (f.business_scope || '').includes(matchKeyword));
        let remaining = pool.filter(f => !matched.includes(f));

        const shuffle = (arr: any[]) => arr.sort(() => Math.random() - 0.5);
        srcCompanies = [...shuffle(matched), ...shuffle(remaining)].slice(0, 50).map(f => f.company_name);
      }

      // ── 注入来源公司到 notes ──
      if (srcCompanies.length > 0) {
        const srcTag = `【来源：${srcCompanies.join('、')}】`;
        for (const row of rows) {
          row.notes = row.notes ? `${srcTag} ${row.notes}` : srcTag;
        }
      }

      // Insert into database (link to raw message)
      const inserted = await insertParsedCargo(rows, userId, rawId, category, contactInfo);

      // ── 反向匹配：新舱位是否满足之前的零结果搜索需求 ──
      if (inserted > 0) {
        try {
          const allPorts: string[] = [];
          for (const row of rows) {
            if (row.origin_port) allPorts.push(row.origin_port);
            if (row.dest_port) allPorts.push(row.dest_port);
          }
          if (allPorts.length > 0) {
            let demandQuery = db('demand_records').where('notified', 0);
            demandQuery = demandQuery.where(function () {
              for (const p of allPorts) {
                this.orWhere('keyword', 'like', `%${p}%`);
              }
            });
            const demands = await demandQuery.limit(30) as any[];
            const notified = new Set<string>();
            for (const d of demands) {
              if (d.user_id && !notified.has(d.user_id) && d.user_id !== userId) {
                notified.add(d.user_id);
                await db('messages').insert({
                  id: uuidv4(), sender_id: userId, receiver_id: d.user_id,
                  content: `🔔 您之前搜索「${d.category || '舱位'}」：${d.keyword.substring(0, 80)} 现在有新的匹配结果了！\n\n社区刚刚发布了相关航线舱位，快来查看：${env.frontendUrl}/admin/files?tab=query`,
                  is_read: false, created_at: new Date().toISOString(),
                }).catch(() => {});
              }
              await db('demand_records').where({ id: d.id }).update({ notified: 1 });
            }
            if (notified.size > 0) logger.info(`反向通知: ${notified.size} 个用户收到新舱位匹配通知`);
          }
        } catch {}
      }

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
          "cargo_spaces.price_per_cbm", "cargo_spaces.price_per_kg",
          "users.id as user_id", "users.is_newbie",
        )
        .orderBy("cargo_spaces.created_at", "desc")
        .limit(10) as any[];

      // 对未登录用户：只显示公司名（contact_info 的第一个字段），不显示姓名手机号
      const sanitized = latest.map((item: any) => {
        const { contact_info, is_newbie, user_id, price_per_cbm, price_per_kg, ...rest } = item;
        let company_name = null;
        if (contact_info) {
          const parts = contact_info.split(' ');
          company_name = parts[0] || null;
        }
        return { ...rest, company_name, user_id, price_per_cbm, price_per_kg, is_newbie: is_newbie ? true : false };
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
            uploaded_by: userId,
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
          .where('uploaded_by', userId)
          .select('id') as any[];

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

  /** 我的发布记录（当前用户发布的推广/舱位） */
  async myPublications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const currentUser = await db("users").where({ id: userId }).first() as any;
      const phone = currentUser?.phone;

      const { page: pageStr, limit: limitStr } = req.query;
      const page = Math.max(1, parseInt(pageStr as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitStr as string) || 20));
      const offset = (page - 1) * limit;

      // 找到用户的原始记录
      const rawIds = await db("raw_messages").where({ uploaded_by: userId }).select("id");
      const rawIdList = rawIds.map((r: any) => r.id);

      let query = db("cargo_spaces")
        .leftJoin('raw_messages', 'cargo_spaces.uploaded_file_id', 'raw_messages.id')
        .where(function () {
          if (phone) this.where("cargo_spaces.contact_info", "like", "%" + phone + "%");
          if (rawIdList.length > 0) this.orWhereIn("cargo_spaces.uploaded_file_id", rawIdList);
        });

      const countResult = await query.clone().count('* as total').first();
      const total = Number((countResult as any)?.total || 0);

      const items = await query.clone()
        .select(
          'cargo_spaces.id',
          'cargo_spaces.origin_port',
          'cargo_spaces.dest_port',
          'cargo_spaces.region',
          'cargo_spaces.airline_code',
          'cargo_spaces.cargo_type',
          'cargo_spaces.price_per_cbm',
          'cargo_spaces.price_per_kg',
          'cargo_spaces.currency',
          'cargo_spaces.available_cbm',
          'cargo_spaces.available_kg',
          'cargo_spaces.valid_from',
          'cargo_spaces.valid_to',
          'cargo_spaces.status',
          'cargo_spaces.view_count',
          'cargo_spaces.inquiry_count',
          'cargo_spaces.notes',
          'cargo_spaces.contact_info',
          'cargo_spaces.created_at',
          'cargo_spaces.updated_at',
          'raw_messages.original_text',
        )
        .orderBy('cargo_spaces.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      res.json({ data: items, total, page, limit });
    } catch (err) { next(err); }
  },

  /** 公开搜索已注册用户（含免费版每日次数限制，未登录/免费版每日3次） */
  async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q || '').trim();
      if (!q || q.length < 2) { res.json({ data: [], remainingSearch: -1 }); return; }

      const userId = req.user?.id;
      const user = userId ? await db('users').where({ id: userId }).first() : null;
      const planTier = (user as any)?.plan_tier || 'free';
      const trialEnd = (user as any)?.trial_end;
      const isPaidUser = planTier !== 'free' && trialEnd && new Date(trialEnd + 'T23:59:59') > new Date();
      const isAdmin = (user as any)?.role === 'admin';

      let remainingSearch = -1;
      if (!isPaidUser && !isAdmin && userId) {
        const today = new Date().toISOString().split('T')[0];
        const row = await db('search_logs').where({ user_id: userId }).where('created_at', '>=', today + ' 00:00:00').count('* as total').first() as any;
        const c = Number(row?.total || 0);
        remainingSearch = Math.max(0, 3 - c);
        if (c >= 3) {
          const rc: Record<string,number> = {};
          (await db('users').where('status','approved').select('role').select(db.raw('COUNT(*) as cnt')).groupBy('role') as any[]).forEach((r:any) => { rc[r.role] = Number(r.cnt); });
          res.json({ data:[], total:0, roleCounts:rc, remainingSearch:0, overLimit:true }); return;
        }
        try { await db('search_logs').insert({ id: uuidv4(), user_id:userId, keyword:q, created_at:new Date().toISOString() }); } catch {}
      }

      const dbUsers = await db('users').where('status','approved').where(function(){this.where('company_name','like','%'+q+'%').orWhere('display_name','like','%'+q+'%').orWhere('port_city','like','%'+q+'%').orWhere('port_code','like','%'+q+'%').orWhere('operable_ports','like','%'+q+'%');}).select('id','display_name','company_name','role','is_newbie','created_at','port_city','port_code').orderBy('role','asc').limit(20) as any[];
      const sanitized = dbUsers.map((u:any) => ({ id:u.id, display_name:u.display_name, company_name:u.company_name, role:u.role, is_newbie:!!u.is_newbie, days_on_platform:u.created_at?Math.floor((Date.now()-new Date(u.created_at).getTime())/86400000):0 }));
      const roleCounts: Record<string,number> = {};
      dbUsers.forEach((u:any) => { roleCounts[u.role] = (roleCounts[u.role]||0)+1; });
      res.json({ data:sanitized, total:sanitized.length, roleCounts, remainingSearch });
    } catch(err) { next(err); }
  },

  /** 反向匹配：货代输入港口，找出搜过该港口的外贸用户（潜在客户） */
  async matchSearchers(req: Request, res: Response, next: NextFunction) {
    try {
      const port = String(req.query.port || '').trim().toUpperCase();
      if (!port || port.length < 2) { res.json({ data: [], total: 0 }); return; }

      const userId = req.user!.id;
      const user = await db('users').where({ id: userId }).first() as any;
      // 仅货代和管理员可用
      if (user.role !== 'forwarder' && user.role !== 'admin') {
        res.json({ data: [], total: 0 }); return;
      }

      const days = Math.min(Number(req.query.days) || 90, 365);
      const since = new Date(Date.now() - days * 86400000).toISOString();

      const rows = await db('search_logs')
        .join('users', 'search_logs.user_id', 'users.id')
        .where('search_logs.keyword', 'like', `%${port}%`)
        .where('search_logs.created_at', '>=', since)
        .where('users.status', 'approved')
        .whereNot('users.id', userId)
        .select(
          'users.id as user_id', 'users.display_name', 'users.company_name',
          'users.role', 'users.port_city', 'users.port_code',
          'search_logs.keyword', 'search_logs.created_at'
        )
        .orderBy('search_logs.created_at', 'desc')
        .limit(50) as any[];

      // 按用户去重，保留最新搜索
      const seen = new Set<string>();
      const data = rows.filter((r: any) => {
        if (seen.has(r.user_id)) return false;
        seen.add(r.user_id);
        return true;
      }).map((r: any) => ({
        user_id: r.user_id,
        display_name: r.display_name,
        company_name: r.company_name,
        role: r.role,
        port_city: r.port_city,
        port_code: r.port_code,
        match_keyword: r.keyword,
        searched_at: r.created_at,
        days_ago: Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000),
      }));

      // 同时统计该港口的总搜索次数和被多少用户搜过
      const stats = await db('search_logs')
        .where('keyword', 'like', `%${port}%`)
        .where('created_at', '>=', since)
        .count('* as total')
        .first() as any;

      res.json({
        data,
        total: data.length,
        port,
        totalSearches: Number(stats?.total || 0),
        uniqueSearchers: data.length,
      });
    } catch(err) { next(err); }
  },

  /** 向特定用户发起询价（替代直接发消息，防止群发推广） */
  async inquiryUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { receiver_id, origin_port, dest_port, goods_desc, weight_kg, volume_cbm, pieces, notes } = req.body;
      if (!receiver_id) { res.status(400).json({ error:'请选择询价对象' }); return; }
      if (!origin_port || !dest_port) { res.status(400).json({ error:'请填写始发港和目的港' }); return; }

      const sender = await db('users').where({ id:userId }).first() as any;
      const receiver = await db('users').where({ id:receiver_id }).first() as any;
      if (!receiver) { res.status(404).json({ error:'用户不存在' }); return; }

      const lines: string[] = ['📦 新物流询价', '', '来自：'+(sender?.company_name||'')+' '+(sender?.display_name||''), '航线：'+origin_port+' → '+dest_port];
      if (goods_desc) lines.push('货物：'+goods_desc);
      if (pieces) lines.push('件数：'+pieces);
      if (weight_kg) lines.push('重量：'+weight_kg+'KG');
      if (volume_cbm) lines.push('体积：'+volume_cbm+'CBM');
      if (notes) lines.push('备注：'+notes);
      lines.push('', '请回复报价，谢谢！');
      const inquiryContent = lines.join(String.fromCharCode(10));

      await db('messages').insert({ id:uuidv4(), sender_id:userId, receiver_id, content:inquiryContent, is_read:false, created_at:new Date().toISOString() });
      if (receiver.email && receiver.email_verified) {
        try { const { sendInquiryNotification } = await import('../services/email.service'); await sendInquiryNotification(receiver.email, receiver.display_name, sender?.display_name||'', inquiryContent); } catch {}
      }
      res.json({ message:'询价已发送，对方将收到通知' });
    } catch(err:any) { logger.error('询价发送失败:', err.message||err); res.status(500).json({ error:'询价发送失败' }); }
  },

  /** 🚀 紧急填舱推广 — 第一步：创建微信支付订单 */
  async bulkPromote(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { content } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length < 10) {
        return res.status(400).json({ error: '请输入推广内容（至少10个字）' });
      }
      if (content.length > 500) {
        return res.status(400).json({ error: '推广内容不能超过500字' });
      }

      const user = await db('users').where({ id: userId }).first() as any;
      if (!user || (user.role !== 'forwarder' && user.role !== 'admin')) {
        return res.status(403).json({ error: '仅货运代理可使用紧急推广功能' });
      }

      // 查询目标人数
      const targetCount = await db('users')
        .whereIn('role', ['trader', 'forwarder'])
        .where('status', 'approved')
        .whereNot('id', userId)
        .count('* as total').first() as any;
      const count = Number(targetCount?.total || 0);
      if (count === 0) {
        return res.status(400).json({ error: '暂无可推送的用户' });
      }

      // 创建订单（微信支付要求订单号≤32位，去掉UUID的横线）
      const orderId = uuidv4().replace(/-/g, '');
      const amount = 9.9;
      try {
        await db('bulk_promote_orders').insert({
          id: orderId,
          user_id: userId,
          content: content.trim(),
          recipient_count: count,
          amount,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      } catch { /* 表可能不存在 */ }

      // 生成微信支付二维码
      const { isWechatConfigured, createWechatNativePay } = await import('../services/wechat.service');
      let codeUrl = '';
      if (isWechatConfigured()) {
        try {
          const result = await createWechatNativePay(orderId, amount, `紧急填舱推广 - ${user.company_name || user.display_name}`);
          codeUrl = result.codeUrl;
        } catch (e: any) { logger.error('微信支付下单失败:', e.message); }
      }

      res.json({
        order_id: orderId,
        amount,
        recipient_count: count,
        code_url: codeUrl,
        need_wechat_pay: !!codeUrl,
      });
    } catch (err) { next(err); }
  },

  /** 🚀 微信支付回调：支付成功后执行推送 */
  async bulkPromoteCallback(orderId: string) {
    try {
      const order = await db('bulk_promote_orders').where({ id: orderId, status: 'pending' }).first() as any;
      if (!order) return;

      const userId = order.user_id;
      const content = order.content;
      const user = await db('users').where({ id: userId }).first() as any;
      if (!user) return;

      // 查询所有目标用户
      const targets = await db('users')
        .whereIn('role', ['trader', 'forwarder'])
        .where('status', 'approved')
        .whereNot('id', userId)
        .select('id') as any[];

      const company = user.company_name || user.display_name;
      const contactName = user.display_name || '';
      const msgBody = `🚀【紧急填舱推广】\n\n${company}（${contactName}）紧急推广：\n\n${content}\n\n━━━━━━━━━━━━━━━━━━━━\n💬 对此舱位感兴趣？直接回复此消息即可联系 ${contactName}\n📌 此推广由 ${company} 付费发送至全社区`;

      const now = new Date().toISOString();
      const messages = targets.map((t: any) => ({
        id: uuidv4(),
        sender_id: userId,
        receiver_id: t.id,
        content: msgBody,
        is_read: false,
        created_at: now,
      }));

      for (let i = 0; i < messages.length; i += 100) {
        await db('messages').insert(messages.slice(i, i + 100));
      }

      await db('bulk_promote_orders').where({ id: orderId }).update({ status: 'paid', paid_at: now });
      logger.info(`[bulk-promote] 支付成功，${user.username} 推广给 ${targets.length} 人`);
    } catch (err) { logger.error('[bulk-promote] callback failed:', err); }
  },

};