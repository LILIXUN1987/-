import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { logAudit } from '../services/audit.service';
import { sendDdpInquiryEmail } from '../services/email.service';
import logger from '../utils/logger';

export const ddpController = {
  // ════════════════════════════════════════════
  // 一、海外代理 CRUD
  // ════════════════════════════════════════════

  /** 公开列表：已审核代理，支持按国家/港口筛选，含合作统计 */
  async agents(req: Request, res: Response, next: NextFunction) {
    try {
      let query = db('ddp_agents').where({ status: 'approved' });

      const { country, port } = req.query;
      if (country && typeof country === 'string') {
        query = query.where('country', 'like', `%${country.trim()}%`);
      }
      if (port && typeof port === 'string') {
        const portUpper = port.trim().toUpperCase();
        query = query.where(function () {
          this.where('service_ports', 'like', `%${portUpper}%`)
            .orWhere('air_ports', 'like', `%${portUpper}%`)
            .orWhere('sea_ports', 'like', `%${portUpper}%`);
        });
      }

      const data = await query.orderBy('completed_orders', 'desc').orderBy('created_at', 'desc').limit(100);

      // 给每条代理加上合作过的货代数
      const result = [];
      for (const row of data) {
        const agent = row as any;
        if (agent.created_by) {
          const coopCount = await db('cooperations')
            .where({ agent_user_id: agent.created_by, status: 'confirmed' })
            .countDistinct('forwarder_user_id as total').first() as any;
          result.push({ ...agent, coop_forwarder_count: Number(coopCount?.total || 0) });
        } else {
          result.push({ ...agent, coop_forwarder_count: 0 });
        }
      }

      res.json({ data: result });
    } catch (err) { next(err); }
  },

  /** 管理员：查看所有代理（含待审核） */
  async allAgents(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('ddp_agents')
        .leftJoin('users', 'ddp_agents.created_by', 'users.id')
        .select(
          'ddp_agents.*',
          'users.display_name as submitter_name',
        )
        .orderByRaw("CASE WHEN ddp_agents.status='pending' THEN 0 ELSE 1 END")
        .orderBy('ddp_agents.created_at', 'desc')
        .limit(100);
      res.json({ data });
    } catch (err) { next(err); }
  },

  /** 管理员添加/编辑代理 */
  async saveAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, company_name, contact_person, email, phone, country, city, service_ports, service_types, description, reference_price, completed_orders } = req.body;
      if (!company_name) return res.status(400).json({ error: '请填写公司名称' });
      if (!country) return res.status(400).json({ error: '请填写所在国家' });

      const payload = {
        company_name,
        contact_person: contact_person || null,
        email: email || null,
        phone: phone || null,
        country: country.trim(),
        city: city || null,
        service_ports: service_ports || null,
        air_ports: req.body.air_ports || null,
        sea_ports: req.body.sea_ports || null,
        service_types: service_types || 'DDP',
        description: description || null,
        reference_price: reference_price || null,
        completed_orders: completed_orders ?? 0,
      };

      if (id) {
        await db('ddp_agents').where({ id }).update({ ...payload, status: 'approved' });
        res.json({ message: '已更新' });
      } else {
        const newId = uuidv4();
        await db('ddp_agents').insert({ id: newId, ...payload, status: 'approved', created_by: req.user!.id });
        res.status(201).json({ message: '代理已添加', id: newId });
      }
    } catch (err) { next(err); }
  },

  /** 管理员审核 */
  async reviewAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { action } = req.body;
      if (!id || !['approved', 'rejected'].includes(action)) return res.status(400).json({ error: '参数不完整' });

      await db('ddp_agents').where({ id }).update({ status: action });
      logAudit({ action: 'ddp_agent_' + action, target_type: 'ddp_agent', target_id: id, operator_id: req.user!.id });
      res.json({ message: action === 'approved' ? '已通过' : '已驳回' });
    } catch (err) { next(err); }
  },

  /** 管理员删除 */
  async deleteAgent(req: Request, res: Response, next: NextFunction) {
    try {
      await db('ddp_agents').where({ id: req.params.id }).delete();
      logAudit({ action: 'ddp_agent_delete', target_type: 'ddp_agent', target_id: req.params.id, operator_id: req.user!.id });
      res.json({ message: '已删除' });
    } catch (err) { next(err); }
  },

  // ════════════════════════════════════════════
  // 二、海外代理自助入驻
  // ════════════════════════════════════════════

  /** 海外代理自助提交入驻信息 */
  async selfOnboard(req: Request, res: Response, next: NextFunction) {
    try {
      const role = (req.user as any)?.role;
      if (role !== 'overseas_agent') {
        return res.status(403).json({ error: '仅海外代理可提交入驻信息' });
      }

      const userId = req.user!.id;
      const user = await db('users').where({ id: userId }).first() as any;

      // 检查是否已提交过
      const existing = await db('ddp_agents').where({ created_by: userId }).first();
      if (existing) {
        return res.status(400).json({ error: '您已提交过入驻信息，如需修改请联系管理员' });
      }

      const { company_name, contact_person, phone, country, city, service_ports, air_ports, sea_ports, service_types, description, reference_price } = req.body;
      if (!company_name?.trim()) return res.status(400).json({ error: '请填写公司英文名称' });
      if (!country?.trim()) return res.status(400).json({ error: '请填写所在国家' });
      if (!service_ports?.trim() && !air_ports?.trim() && !sea_ports?.trim()) return res.status(400).json({ error: '请填写可操作港口' });

      const id = uuidv4();
      await db('ddp_agents').insert({
        id,
        company_name: company_name.trim(),
        contact_person: contact_person?.trim() || user?.display_name || null,
        email: user?.email || null,
        phone: phone?.trim() || null,
        country: country.trim(),
        city: city?.trim() || null,
        service_ports: service_ports?.trim() || null,
        air_ports: air_ports?.trim() || null,
        sea_ports: sea_ports?.trim() || null,
        service_types: service_types?.trim() || 'DDP,DDU,清关,派送',
        description: description?.trim() || null,
        reference_price: reference_price?.trim() || null,
        status: 'approved',
        created_by: userId,
      });

      // 通知管理员有新代理入驻
      const admins = await db('users').where({ role: 'admin' }).select('id');
      for (const a of admins) {
        try { await db('messages').insert({ id: uuidv4(), sender_id: userId, receiver_id: a.id, content: `🌍 新海外代理自助入驻\n\n${company_name}（${country}）已通过自助入驻成为海外代理，现已展示在DDP代理列表中。`, is_read: false, created_at: new Date().toISOString() }); } catch {}
      }

      res.status(201).json({ message: '✅ 入驻成功！您的信息已展示在海外代理列表中', id });
    } catch (err) { next(err); }
  },

  /** 获取当前用户的代理入驻状态 */
  async myOnboardStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const agent = await db('ddp_agents').where({ created_by: userId }).first();
      res.json({ registered: !!agent, agent: agent || null });
    } catch (err) { next(err); }
  },

  // ════════════════════════════════════════════
  // 二、DDP询价
  // ════════════════════════════════════════════

  /** 用户上传DDP文件（箱单发票等） */
  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return res.status(400).json({ error: '请选择文件上传' });
      res.json({ filePath: req.file.path });
    } catch (err) { next(err); }
  },

  /** 用户提交 DDP 询价 → 推送给该国所有已审核代理 */
  async submitInquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const { direction, country, port, goods_desc, hs_code, notes, file_paths, weight_kg, volume_cbm, address } = req.body;
      const isImport = direction === 'import';
      if (!country?.trim()) return res.status(400).json({ error: '请填写目的国家' });
      if (!address?.trim()) return res.status(400).json({ error: '请填写派送地址' });
      if (!notes?.trim()) return res.status(400).json({ error: '请填写详细的件数/重量/尺寸信息，如：1件毛重160KG 120*100*80/1' });

      const userId = req.user!.id;
      const senderUser = await db('users').where({ id: userId }).first() as any;
      const senderName = senderUser?.display_name || '用户';
      const senderCompany = senderUser?.company_name || '';

      // 1. 记录询价
      const inquiryId = uuidv4();
      await db('ddp_inquiries').insert({
        id: inquiryId,
        country: country.trim(),
        port: port || null,
        goods_desc: goods_desc || null,
        hs_code: hs_code || null,
        notes: notes || null,
        file_paths: file_paths ? JSON.stringify(file_paths) : null,
        weight_kg: weight_kg || null,
        volume_cbm: volume_cbm || null,
        address: address || null,
        user_id: userId,
      });

      // 2. 按目的国查找匹配的服务方
      // 进口到中国 → 推送给社区的中国货代（forwarder）
      // 出口到海外 → 推送给 ddp_agents 中服务该国的海外代理
      let agents: any[] = [];
      if (isImport) {
        agents = await db('users')
          .where({ role: 'forwarder', status: 'approved' })
          .select(db.raw("id as created_by"), 'email', 'company_name')
          .limit(50) as any[];
      } else {
        const countryQ = country.trim();
        const portQ = port?.trim() || '';
        agents = await db('ddp_agents')
          .where({ status: 'approved' })
          .where('country', 'like', `%${countryQ}%`)
          .select('id', 'created_by', 'email', 'company_name', 'service_ports', 'air_ports', 'sea_ports')
          .orderByRaw(portQ
            ? `CASE WHEN INSTR(COALESCE(service_ports,'')||COALESCE(air_ports,'')||COALESCE(sea_ports,''), '${portQ.replace(/'/g, "''")}') > 0 THEN INSTR(COALESCE(service_ports,'')||COALESCE(air_ports,'')||COALESCE(sea_ports,''), '${portQ.replace(/'/g, "''")}') ELSE 999 END, completed_orders DESC`
            : 'completed_orders DESC'
          ) as any[];
      }

      if (agents.length === 0) {
        return res.json({ message: '已收到您的需求，但目前暂无匹配的服务方，我们会尽快拓展！', notified: 0 });
      }

      // 3. 构造询价详情文本（推送给海外代理 → 英文）
      const directionLabel = isImport ? '🌍 Import to China' : '📦 Export to';
      const detailParts = [`${directionLabel}\n`];
      detailParts.push(`━━━━━━━━━━━━━━━━━━━━━`);
      detailParts.push(`📋 Requirements`);
      detailParts.push(`${isImport ? 'Origin' : 'Destination'}: ${country.trim()}${port ? ` / Port: ${port}` : ''}`);
      if (goods_desc) detailParts.push(`Cargo: ${goods_desc}`);
      if (hs_code) detailParts.push(`HS Code: ${hs_code}`);
      if (notes) detailParts.push(`Pcs/Weight/Dims: ${notes}`);
      if (weight_kg) detailParts.push(`Total Weight: ${weight_kg} KG`);
      if (volume_cbm) detailParts.push(`Total Volume: ${volume_cbm} CBM`);
      if (file_paths) detailParts.push(`📎 Packing list & invoice uploaded, please log in to view`);
      detailParts.push(`━━━━━━━━━━━━━━━━━━━━━`);
      detailParts.push(`📍 Delivery Address: ${address || 'TBD'}`);
      detailParts.push(`━━━━━━━━━━━━━━━━━━━━━`);
      detailParts.push(`👤 Inquirer: ${senderCompany} ${senderName}`);
      detailParts.push(`📬 Please reply with your quote via internal message. The client will receive it directly.`);

      const messageContent = detailParts.join('\n');

      // 4. 给每个代理发站内信
      let notifiedCount = 0;
      for (const agent of agents) {
        const receiverId = agent.created_by;
        if (!receiverId || receiverId === userId) continue;
        try {
          await db('messages').insert({
            id: uuidv4(),
            sender_id: userId,
            receiver_id: receiverId,
            content: messageContent,
            is_read: false,
            created_at: new Date().toISOString(),
          });
          notifiedCount++;
        } catch (err) {
          logger.error(`发送DDP询价站内信给代理 ${agent.id} 失败:`, err);
        }

        // 5. 代理有邮箱则发邮件通知（英文）
        if (agent.email) {
          try {
            await sendDdpInquiryEmail(
              agent.email,
              agent.company_name || 'Overseas Agent',
              country.trim(),
              goods_desc || '',
              notes || '',
              senderName,
              senderCompany,
            );
          } catch (err) {
            logger.error(`发送DDP询价邮件给 ${agent.email} 失败:`, err);
          }
        }
      }

      res.json({
        message: isImport ? `✅ 您的进口需求已发送给 ${notifiedCount} 位中国货代，请留意收件箱报价回复` : `✅ 您的询价已发送给 ${country} 的 ${notifiedCount} 位海外代理，请留意收件箱报价回复`,
        notified: notifiedCount,
        inquiry_id: inquiryId,
      });
    } catch (err) { next(err); }
  },

  // ════════════════════════════════════════════
  // 三、我的询价汇总
  // ════════════════════════════════════════════

  /** 我的DDP询价列表（含各代理回复数） */
  async myInquiries(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const inquiries = await db('ddp_inquiries')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(50);

      // 对每条询价，查该国代理的回复数
      const result = [];
      for (const inv of inquiries) {
        const invRow = inv as any;
        // 找到发送给该国代理的消息中，代理回复的消息数
        // 询价时发送的消息内容是 "🌍 DDP到门询价通知\n..."
        // 回复是代理发给用户的
        const agentReplyCount = await db('messages')
          .where({ receiver_id: userId })
          .where('content', 'like', `%${invRow.country}%`)
          .where('content', 'like', `%DDP%`)
          .count('* as total')
          .first() as any;

        result.push({
          id: invRow.id,
          country: invRow.country,
          port: invRow.port,
          goods_desc: invRow.goods_desc,
          notes: invRow.notes,
          created_at: invRow.created_at,
          reply_count: Number(agentReplyCount?.total || 0),
        });
      }

      res.json({ data: result });
    } catch (err) { next(err); }
  },

  // ════════════════════════════════════════════
  // 四、需求热度统计（增强版）
  // ════════════════════════════════════════════

  /** 按国家聚合询价量（支持时间范围筛选） */
  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const range = parseInt(req.query.range as string) || 0;
      const dateFilter = range > 0 ? new Date(Date.now() - range * 86400000).toISOString() : null;

      const inquiryQuery = () => {
        let q = db('ddp_inquiries');
        if (dateFilter) q = q.where('created_at', '>=', dateFilter);
        return q;
      };

      // 各国询价热度
      const inquiryStats = await inquiryQuery()
        .select('country')
        .count('* as count')
        .groupBy('country')
        .orderBy('count', 'desc')
        .limit(20) as any[];

      // 各国代理数量
      const agentCounts = await db('ddp_agents')
        .select('country')
        .where({ status: 'approved' })
        .count('* as count')
        .groupBy('country')
        .orderBy('count', 'desc') as any[];

      // 总览
      const totalInquiries = dateFilter
        ? await db('ddp_inquiries').where('created_at', '>=', dateFilter).count('* as total').first()
        : await db('ddp_inquiries').count('* as total').first();
      const totalAgents = await db('ddp_agents').where({ status: 'approved' }).count('* as total').first() as any;
      const pendingAgents = await db('ddp_agents').where({ status: 'pending' }).count('* as total').first() as any;

      // === 增强数据 ===

      // 5a. 询价回复率：有回复的询价数 / 总询价数
      const allInquiries = await db('ddp_inquiries').select('id', 'user_id', 'country');
      let repliedCount = 0;
      for (const inv of allInquiries as any[]) {
        const replyExists = await db('messages')
          .where({ receiver_id: inv.user_id })
          .where('content', 'like', `%${inv.country}%`)
          .where('content', 'like', `%DDP%`)
          .first();
        if (replyExists) repliedCount++;
      }
      const totalInq = allInquiries.length || 1;
      const replyRate = Math.round((repliedCount / totalInq) * 100);

      // 5b. 最近7天新增询价数
      const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();
      const weeklyNewInquiries = await db('ddp_inquiries')
        .where('created_at', '>=', lastWeek)
        .count('* as total').first() as any;

      // 5c. 最近7天新增代理数
      const weeklyNewAgents = await db('ddp_agents')
        .where('created_at', '>=', lastWeek)
        .where({ status: 'approved' })
        .count('* as total').first() as any;

      // 5d. 本月新增 vs 上月新增（增长趋势）
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const lastMonthStart = new Date(monthStart);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

      const thisMonthAgents = await db('ddp_agents')
        .where('created_at', '>=', monthStart.toISOString())
        .where({ status: 'approved' })
        .count('* as total').first() as any;
      const lastMonthAgents = await db('ddp_agents')
        .where('created_at', '>=', lastMonthStart.toISOString())
        .where('created_at', '<', monthStart.toISOString())
        .where({ status: 'approved' })
        .count('* as total').first() as any;

      // 5e. 最近 DDP 动态（最近5条询价）
      const recentActivity = await db('ddp_inquiries')
        .leftJoin('users', 'ddp_inquiries.user_id', 'users.id')
        .select(
          'ddp_inquiries.id',
          'ddp_inquiries.country',
          'ddp_inquiries.port',
          'ddp_inquiries.goods_desc',
          'ddp_inquiries.created_at',
          'users.company_name',
          'users.display_name',
        )
        .orderBy('ddp_inquiries.created_at', 'desc')
        .limit(5);

      res.json({
        inquiryStats: inquiryStats.map((r: any) => ({ country: r.country, count: Number(r.count) })),
        agentStats: agentCounts.map((r: any) => ({ country: r.country, count: Number(r.count) })),
        overview: {
          totalInquiries: Number((totalInquiries as any)?.total || 0),
          totalAgents: Number((totalAgents as any)?.total || 0),
          pendingAgents: Number((pendingAgents as any)?.total || 0),
        },
        // 增强数据
        replyRate,
        weeklyNewInquiries: Number((weeklyNewInquiries as any)?.total || 0),
        weeklyNewAgents: Number((weeklyNewAgents as any)?.total || 0),
        agentGrowth: {
          thisMonth: Number((thisMonthAgents as any)?.total || 0),
          lastMonth: Number((lastMonthAgents as any)?.total || 0),
        },
        recentActivity: recentActivity.map((r: any) => ({
          id: r.id,
          country: r.country,
          port: r.port,
          goods_desc: r.goods_desc,
          company_name: r.company_name || r.display_name || '用户',
          created_at: r.created_at,
        })),
      });
    } catch (err) { next(err); }
  },

  // ════════════════════════════════════════════
  // 五、结构化报价管理
  // ════════════════════════════════════════════

  /** 海外代理提交报价 */
  async submitQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const { inquiry_id, ocean_freight, clearance_fee, delivery_fee, duty_fee, other_fees, total_price, currency, valid_until, notes, reply_content } = req.body;
      const agentUserId = req.user!.id;

      if (!inquiry_id) return res.status(400).json({ error: '缺少询价ID' });

      // 验证询价存在
      const inquiry = await db('ddp_inquiries').where({ id: inquiry_id }).first();
      if (!inquiry) return res.status(404).json({ error: '询价不存在' });

      // 检查是否已报过价
      const existing = await db('ddp_quotes').where({ inquiry_id, agent_user_id: agentUserId }).first();
      if (existing) {
        // 更新已有报价
        await db('ddp_quotes').where({ id: existing.id }).update({
          ocean_freight: ocean_freight || null,
          clearance_fee: clearance_fee || null,
          delivery_fee: delivery_fee || null,
          duty_fee: duty_fee || null,
          other_fees: other_fees || null,
          total_price: total_price || null,
          currency: currency || 'USD',
          valid_until: valid_until || null,
          notes: notes || null,
          reply_content: reply_content || null,
          status: 'pending',
          updated_at: new Date().toISOString(),
        });
        return res.json({ message: '报价已更新', id: existing.id });
      }

      const quoteId = uuidv4();
      await db('ddp_quotes').insert({
        id: quoteId,
        inquiry_id,
        agent_user_id: agentUserId,
        forwarder_user_id: (inquiry as any).user_id,
        ocean_freight: ocean_freight || null,
        clearance_fee: clearance_fee || null,
        delivery_fee: delivery_fee || null,
        duty_fee: duty_fee || null,
        other_fees: other_fees || null,
        total_price: total_price || null,
        currency: currency || 'USD',
        valid_until: valid_until || null,
        notes: notes || null,
        reply_content: reply_content || null,
        status: 'pending',
      });

      // 同时向货代发送站内信通知
      if (reply_content) {
        const agentUser = await db('users').where({ id: agentUserId }).first() as any;
        await db('messages').insert({
          id: uuidv4(),
          sender_id: agentUserId,
          receiver_id: (inquiry as any).user_id,
          content: `📊 您有一份新的DDP报价\n\n${reply_content}\n━━━━━━━━━━━━━━━━━━\n来自: ${agentUser?.company_name || agentUser?.display_name || '海外代理'}\n报价单ID: ${quoteId}\n请在DDP页面查看详情。`,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      res.status(201).json({ message: '报价已提交', id: quoteId });
    } catch (err) { next(err); }
  },

  /** 获取某个询价的报价列表 */
  async getQuotes(req: Request, res: Response, next: NextFunction) {
    try {
      const { inquiryId } = req.params;
      const userId = req.user!.id;

      const quotes = await db('ddp_quotes')
        .leftJoin('users', 'ddp_quotes.agent_user_id', 'users.id')
        .where({ inquiry_id: inquiryId })
        .select(
          'ddp_quotes.*',
          'users.company_name as agent_company',
          'users.display_name as agent_name',
        )
        .orderBy('ddp_quotes.created_at', 'desc');

      // 只允许询价的发起人或报价的代理查看
      const inquiry = await db('ddp_inquiries').where({ id: inquiryId }).first() as any;
      const filtered = quotes.filter((q: any) =>
        userId === inquiry?.user_id || userId === q.agent_user_id
      );

      res.json({ data: filtered });
    } catch (err) { next(err); }
  },

  /** 货代接受/拒绝报价 */
  async respondQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'accepted' | 'rejected'
      const userId = req.user!.id;

      if (!['accepted', 'rejected'].includes(action)) {
        return res.status(400).json({ error: '无效操作' });
      }

      const quote = await db('ddp_quotes').where({ id }).first() as any;
      if (!quote) return res.status(404).json({ error: '报价不存在' });

      // 只有询价的发起人可以接受/拒绝
      const inquiry = await db('ddp_inquiries').where({ id: quote.inquiry_id }).first() as any;
      if (inquiry?.user_id !== userId) {
        return res.status(403).json({ error: '无权操作' });
      }

      await db('ddp_quotes').where({ id }).update({
        status: action,
        updated_at: new Date().toISOString(),
      });

      // 通知代理
      const user = await db('users').where({ id: userId }).first() as any;
      const statusText = action === 'accepted' ? '✅ 已接受' : '❌ 已拒绝';
      await db('messages').insert({
        id: uuidv4(),
        sender_id: userId,
        receiver_id: quote.agent_user_id,
        content: `${statusText}\n\n客户 ${user?.company_name || user?.display_name || '用户'} 已${action === 'accepted' ? '接受' : '拒绝'}您的报价。\n报价单ID: ${id}`,
        is_read: false,
        created_at: new Date().toISOString(),
      });

      res.json({ message: action === 'accepted' ? '已接受报价' : '已拒绝报价' });
    } catch (err) { next(err); }
  },

  /** 获取当前用户的报价列表（作为代理或作为货代） */
  async myQuotes(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const role = (req.user as any)?.role;

      let quotes;
      if (role === 'overseas_agent') {
        // 海外代理：我报的价
        quotes = await db('ddp_quotes')
          .leftJoin('ddp_inquiries', 'ddp_quotes.inquiry_id', 'ddp_inquiries.id')
          .where('ddp_quotes.agent_user_id', userId)
          .select(
            'ddp_quotes.*',
            'ddp_inquiries.country',
            'ddp_inquiries.port',
            'ddp_inquiries.goods_desc',
            'ddp_inquiries.notes as inquiry_notes',
          )
          .orderBy('ddp_quotes.created_at', 'desc')
          .limit(50);
      } else {
        // 货代/其他：我收到的报价
        quotes = await db('ddp_quotes')
          .leftJoin('ddp_inquiries', 'ddp_quotes.inquiry_id', 'ddp_inquiries.id')
          .leftJoin('users', 'ddp_quotes.agent_user_id', 'users.id')
          .where('ddp_quotes.forwarder_user_id', userId)
          .select(
            'ddp_quotes.*',
            'ddp_inquiries.country',
            'ddp_inquiries.port',
            'ddp_inquiries.goods_desc',
            'ddp_inquiries.notes as inquiry_notes',
            'users.company_name as agent_company',
            'users.display_name as agent_name',
          )
          .orderBy('ddp_quotes.created_at', 'desc')
          .limit(50);
      }

      res.json({ data: quotes || [] });
    } catch (err) { next(err); }
  },

  // ════════════════════════════════════════════
  // 六、入驻草稿管理
  // ════════════════════════════════════════════

  /** 保存代理入驻草稿 */
  async saveOnboardingDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { company_name, country, service_ports, air_ports, sea_ports, contact_person, phone, email, step_reached } = req.body;

      const existing = await db('ddp_onboarding_drafts').where({ user_id: userId }).first();
      const allPorts = [service_ports, air_ports, sea_ports].filter(Boolean).join(',') || null;
      const payload = {
        company_name: company_name || null,
        country: country || null,
        service_ports: allPorts,
        contact_person: contact_person || null,
        phone: phone || null,
        email: email || null,
        step_reached: step_reached || 1,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await db('ddp_onboarding_drafts').where({ user_id: userId }).update(payload);
      } else {
        await db('ddp_onboarding_drafts').insert({
          id: uuidv4(),
          user_id: userId,
          ...payload,
        });
      }

      res.json({ message: '草稿已保存' });
    } catch (err) { next(err); }
  },

  /** 获取当前用户的入驻草稿 */
  async getOnboardingDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const draft = await db('ddp_onboarding_drafts').where({ user_id: userId }).first();
      res.json({ data: draft || null });
    } catch (err) { next(err); }
  },

  /** 管理员：查看未完成入驻的代理列表 */
  async pendingOnboardings(req: Request, res: Response, next: NextFunction) {
    try {
      const drafts = await db('ddp_onboarding_drafts')
        .leftJoin('users', 'ddp_onboarding_drafts.user_id', 'users.id')
        .select(
          'ddp_onboarding_drafts.*',
          'users.display_name',
          'users.email as user_email',
          'users.company_name as user_company',
          'users.created_at as user_created_at',
        )
        .orderBy('ddp_onboarding_drafts.updated_at', 'desc')
        .limit(50);

      res.json({ data: drafts });
    } catch (err) { next(err); }
  },

  // ════════════════════════════════════════════
  // 七、代理标签计算
  // ════════════════════════════════════════════

  /** 为代理生成热门路线标签 */
  async computeAgentTags(req: Request, res: Response, next: NextFunction) {
    try {
      const agents = await db('ddp_agents').where({ status: 'approved' });

      for (const agent of agents as any[]) {
        const tags: string[] = [];
        const country = (agent.country || '').toLowerCase();
        const ports = (agent.service_ports || '').toUpperCase();

        // 基于国家的通用标签
        if (country.includes('usa') || country.includes('美国') || ports.includes('US')) {
          tags.push('美线专家');
          if (ports.includes('LAX') || ports.includes('LGB')) tags.push('美西线活跃');
          if (ports.includes('NYC') || ports.includes('NY') || ports.includes('EWR')) tags.push('美东线活跃');
          if (ports.includes('CHI') || ports.includes('ORD')) tags.push('美中线活跃');
        }
        if (country.includes('germany') || country.includes('德国') || ports.includes('DE')) {
          tags.push('欧线专家');
          tags.push('德国双清');
        }
        if (country.includes('uk') || country.includes('英国') || ports.includes('GB')) {
          tags.push('欧线专家');
          tags.push('英国双清');
        }
        if (country.includes('france') || country.includes('法国') || ports.includes('FR')) {
          tags.push('欧线专家');
        }
        if (country.includes('netherlands') || country.includes('荷兰') || ports.includes('NL')) {
          tags.push('欧线专家');
          tags.push('荷兰转运');
        }
        if (country.includes('japan') || country.includes('日本') || ports.includes('JP')) {
          tags.push('日线专家');
        }
        if (country.includes('korea') || country.includes('韩国') || ports.includes('KR')) {
          tags.push('韩线专家');
        }
        if (country.includes('vietnam') || country.includes('越南') || ports.includes('VN')) {
          tags.push('东南亚专线');
        }
        if (country.includes('thailand') || country.includes('泰国') || ports.includes('TH')) {
          tags.push('东南亚专线');
        }
        if (country.includes('india') || country.includes('印度') || ports.includes('IN')) {
          tags.push('印巴专线');
        }
        if (country.includes('australia') || country.includes('澳大利亚') || ports.includes('AU')) {
          tags.push('澳新专线');
        }
        if (country.includes('uae') || country.includes('阿联酋') || ports.includes('AE') || ports.includes('DXB')) {
          tags.push('中东专线');
        }
        if (country.includes('saudi') || country.includes('沙特') || ports.includes('SA')) {
          tags.push('中东专线');
        }
        if (country.includes('brazil') || country.includes('巴西') || ports.includes('BR')) {
          tags.push('南美专线');
        }
        if (country.includes('kenya') || country.includes('肯尼亚') || ports.includes('KE')) {
          tags.push('非洲专线');
        }
        if (country.includes('nigeria') || country.includes('尼日利亚') || ports.includes('NG')) {
          tags.push('非洲专线');
        }
        if (country.includes('south africa') || country.includes('南非') || ports.includes('ZA')) {
          tags.push('非洲专线');
        }

        // 基于服务类型
        const serviceTypes = (agent.service_types || '').toLowerCase();
        if (serviceTypes.includes('ddp')) tags.push('DDP双清');
        if (serviceTypes.includes('ddu')) tags.push('DDU到门');
        if (serviceTypes.includes('clearance') || serviceTypes.includes('清关')) tags.push('专业清关');
        if (serviceTypes.includes('warehouse') || serviceTypes.includes('仓储')) tags.push('海外仓');

        // 基于完单数
        if (agent.completed_orders >= 50) tags.push('高频合作🔥');
        else if (agent.completed_orders >= 20) tags.push('经验丰富');
        else if (agent.completed_orders >= 5) tags.push('稳定接单');

        // 去重并限制最多4个标签
        const uniqueTags = [...new Set(tags)].slice(0, 4);
        await db('ddp_agents').where({ id: agent.id }).update({ tags: uniqueTags.join(',') || null });
      }

      res.json({ message: `已更新 ${agents.length} 个代理标签` });
    } catch (err) { next(err); }
  },
};
