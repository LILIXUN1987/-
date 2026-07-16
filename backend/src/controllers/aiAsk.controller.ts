import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { aiChat, isAiConfigured } from '../services/ai.service';
import logger from '../utils/logger';

export const aiAskController = {
  async ask(req: Request, res: Response, next: NextFunction) {
    try {
      const { question } = req.body;
      if (!question || typeof question !== 'string' || question.trim().length < 2) {
        return res.status(400).json({ error: '请输入您的问题' });
      }

      const isAuth = !!req.user;
      let q = question.trim();
      let truncated = false;
      if (q.length > 200) {
        q = q.substring(0, 200);
        truncated = true;
      }

      // ── 1. 搜索相关运价 ──
      const keywords = q.match(/[A-Za-z]{3,}/g) || [];
      const chinesePorts = q.match(/[一-龥]{2,4}(?:港|机场|市)/g) || [];
      const searchTerms = [...keywords, ...chinesePorts].filter(Boolean);

      let cargoContext = '';
      if (searchTerms.length > 0) {
        const relatedCargos = await db('cargo_spaces')
          .where('status', 'available')
          .where('valid_to', '>=', db.raw("date('now')"))
          .where(function (this: any) {
            for (const term of searchTerms) {
              this.orWhere('origin_port', 'like', `%${term}%`)
                .orWhere('dest_port', 'like', `%${term}%`)
                .orWhere('region', 'like', `%${term}%`)
                .orWhere('notes', 'like', `%${term}%`);
            }
          })
          .select('origin_port', 'dest_port', 'airline_code', 'price_per_kg', 'price_per_cbm', 'currency', 'valid_from', 'valid_to', 'notes', 'contact_info')
          .orderBy('view_count', 'desc')
          .limit(8) as any[];

        if (relatedCargos.length > 0) {
          // 未登录用户脱敏：去掉联系方式
          const sanitized = isAuth ? relatedCargos : relatedCargos.map((c: any) => {
            const { contact_info, ...rest } = c;
            return { ...rest, contact_info: null };
          });
          cargoContext = '当前社区中的相关运价信息：\n' + sanitized.map((c: any) =>
            `  - ${c.origin_port || '?'} → ${c.dest_port || '?'}${c.airline_code ? ` (${c.airline_code})` : ''}${c.price_per_kg ? ` ¥${c.price_per_kg}/kg` : ''}${c.price_per_cbm ? ` ¥${c.price_per_cbm}/cbm` : ''}${c.notes ? ` ${c.notes.substring(0, 80)}` : ''} 有效期:${c.valid_from || '?'}~${c.valid_to || '?'}`
          ).join('\n');
        }
      }

      // ── 2. 搜索避雷/投诉信息 ──
      const complaintTargets = await db('complaints')
        .select('target_company')
        .select(db.raw('COUNT(*) as cnt'))
        .groupBy('target_company')
        .orderByRaw('COUNT(*) DESC')
        .limit(10) as any[];

      let complaintContext = '';
      if (complaintTargets.length > 0) {
        const topComplaints = complaintTargets.slice(0, 5);
        complaintContext = '社区中被投诉最多的货代：\n' + topComplaints.map((c: any) =>
          `  - ${c.target_company}（${c.cnt}次投诉）`
        ).join('\n');
      }

      // ── 3. 搜索近期热门航线 ──
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateStr = sevenDaysAgo.toISOString();

      const trending = await db('search_logs')
        .where('created_at', '>=', dateStr)
        .whereNotNull('keyword')
        .select('keyword')
        .select(db.raw('COUNT(*) as cnt'))
        .groupBy('keyword')
        .orderByRaw('COUNT(*) DESC')
        .limit(8) as any[];

      let trendingContext = '';
      if (trending.length > 0) {
        trendingContext = '本周社区热门搜索航线：\n' + trending.map((t: any) =>
          `  - ${t.keyword}（${t.cnt}次搜索）`
        ).join('\n');
      }

      // ── 4. 平台数据概况 ──
      const [userCount] = await db('users').count('* as total');
      const [cargoCount] = await db('cargo_spaces')
        .where('status', 'available')
        .where('valid_to', '>=', db.raw("date('now')"))
        .count('* as total');

      const platformContext = `平台数据概况：\n  - 注册用户：${(userCount as any)?.total || 0} 人\n  - 有效舱位：${(cargoCount as any)?.total || 0} 条`;

      // ── 组装 prompt ──
      const systemPrompt = `你是一个专业的国际物流行业AI助手，回答关于外贸、货代、物流运输的问题。

你的回答风格：
1. 简洁、实用、直接给出答案
2. 使用中文回答，适当夹杂行业术语
3. 如果问题涉及具体航线或运价，优先使用社区数据中的实际信息
4. 如果没有数据支撑，诚实说明，并给出行业通用建议
5. 不要编造数据，只能使用下面提供的社区数据

${platformContext}

${trendingContext}

${cargoContext}

${complaintContext}

回答提示：
- 如果用户问"哪家货代靠谱"，可以提及被投诉情况
- 如果用户问具体航线价格，引用社区中的运价数据
- 如果用户问行业趋势，引用热门搜索数据
- 回答末尾可以建议用户注册社区获取更多详细信息`;

      // ── 5. 调用AI生成回答 ──
      let answer = '';
      if (isAiConfigured()) {
        try {
          answer = await aiChat(systemPrompt, q, { maxTokens: 2048, temperature: 0.5 });
        } catch (aiErr) {
          logger.error('[AI] AI API call failed:', aiErr);
          answer = '抱歉，AI服务暂时不可用，请稍后再试。';
        }
      } else {
        // 未配置AI时的降级回答
        const hasData = cargoContext || complaintContext || trendingContext;
        answer = `📋 根据社区当前数据：\n\n`;
        if (trendingContext) answer += `📊 本周大家都在搜：\n${trendingContext}\n\n`;
        if (cargoContext) answer += `📦 相关运价信息：\n${cargoContext}\n\n`;
        if (!hasData) {
          answer += `关于「${q}」，社区中暂无直接匹配的信息。\n建议您注册后发布需求，货代会主动联系您报价。`;
        } else {
          answer += `💡 以上信息来自社区实时数据。注册后可查看联系方式并发起询价。`;
        }
      }

      if (truncated) {
        answer = `⚠️ 您的问题超过200字，已自动截断。\n\n${answer}`;
      }

      res.json({
        question: q,
        answer,
        hasData: !!(cargoContext || complaintContext || trendingContext),
        sources: {
          cargos: cargoContext ? (cargoContext.match(/->/g)?.length || 0) + 1 : 0,
          complaints: complaintTargets.length,
          trending: trending.length,
        },
      });
    } catch (err) {
      logger.error('[AI] aiAsk error:', err);
      next(err);
    }
  },
};
