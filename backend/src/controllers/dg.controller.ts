import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { logAudit } from '../services/audit.service';

export const dgController = {
  // ════════════════════════════════════════════
  // 一、危险品代理（支持 type 过滤）
  // ════════════════════════════════════════════

  async agents(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as string) || 'air';
      const data = await db('dg_agents').where({ status: 'approved', type: type }).orderBy('created_at', 'desc').limit(50);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async addAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { company_name, contact_person, phone, service_categories, description, type, ports } = req.body;
      if (!company_name) return res.status(400).json({ error: '请填写公司名称' });

      const userId = req.user!.id;
      const user = await db('users').where({ id: userId }).first() as any;

      // 量化条件：满足任意一条即可自动通过
      // 条件①：提交过 ≥3 个不同 UN 编号的已发布实例
      const caseCount = await db('dg_cases')
        .where({ created_by: userId, status: 'approved' })
        .countDistinct('un_number as total').first() as any;
      const distinctUnCount = Number(caseCount?.total || 0);

      // 条件②：有 ≥2 个不同用户的评价
      const reviewCount = await db('reviews')
        .where({ reviewee_id: userId })
        .countDistinct('reviewer_id as total').first() as any;
      const reviewerCount = Number(reviewCount?.total || 0);

      // 条件③：上传了名片
      const hasCard = !!user?.card_image;

      const autoApproved = distinctUnCount >= 3 || reviewerCount >= 2 || hasCard;
      const status = autoApproved ? 'approved' : 'pending';

      await db('dg_agents').insert({
        id: uuidv4(), company_name, contact_person: contact_person || null, phone: phone || null,
        service_categories: service_categories || null, description: description || null,
        type: type || 'air', ports: ports || null, created_by: userId, status,
      });

      if (autoApproved) {
        res.status(201).json({ message: '✅ 恭喜！您已成功成为危险品代理' });
      } else {
        // 不满足条件时通知管理员人工审核（后备）
        const admins = await db('users').where({ role: 'admin' }).select('id');
        for (const a of admins) {
          try { await db('messages').insert({ id: uuidv4(), sender_id: userId, receiver_id: a.id, content: `⚠️ 危险品代理入驻待审核\n\n${user?.company_name || ''} ${user?.display_name || ''} 提交了代理申请，但不满足自动通过条件（需满足以下任意一条）：\n· ≥3个不同UN编号的实例：当前 ${distinctUnCount} 个\n· ≥2个用户评价：当前 ${reviewerCount} 个\n· 已上传名片：${hasCard ? '✅' : '❌'}\n\n请管理员登录后台审核。`, is_read: false, created_at: new Date().toISOString() }); } catch {}
        }
        res.status(201).json({ message: `代理信息已提交，暂未满足自动通过条件（需≥3个UN编号实例或≥2个评价或已上传名片），已通知管理员人工审核` });
      }
    } catch (err) { next(err); }
  },

  async allAgents(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as string) || 'air';
      const data = await db('dg_agents').where({ type }).orderBy('created_at', 'desc').limit(100);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async reviewAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, action } = req.body;
      if (!id || !['approved', 'rejected'].includes(action)) return res.status(400).json({ error: '参数不完整' });

      if (action === 'approved') {
        const agentRow = await db('dg_agents').where({ id }).first() as any;
        if (!agentRow) return res.status(404).json({ error: '代理信息不存在' });
        const userId = agentRow.created_by;
        const companyName = agentRow.company_name;

        // 条件①：该业务员必须有≥1个已批准的走货实例
        const myCaseCount = await db('dg_cases')
          .where({ created_by: userId, status: 'approved' }).whereNotNull('un_number').count('* as total').first() as any;
        const myTotal = Number(myCaseCount?.total || 0);
        if (myTotal < 1) return res.status(400).json({
          error: '该业务员尚无已批准走货实例，至少需要有1个已批准实例才能成为危险品代理',
          code: 'NO_APPROVED_CASE',
        });

        // 条件②：同一公司内，该业务员的UN号不能与其他已批准的同事重复
        const myCases = await db('dg_cases').where({ created_by: userId, status: 'approved' }).whereNotNull('un_number').select('un_number');
        for (const myCase of myCases) {
          const myUn = (myCase as any).un_number;
          const duplicate = await db('dg_agents')
            .where({ company_name: companyName, status: 'approved' })
            .where('created_by', '!=', userId)
            .whereExists(function () {
              this.select('*').from('dg_cases')
                .whereRaw('dg_cases.created_by = dg_agents.created_by')
                .where('dg_cases.un_number', myUn)
                .where('dg_cases.status', 'approved');
            })
            .first();
          if (duplicate) {
            return res.status(400).json({
              error: `UN编号 ${myUn} 已被贵司其他已批准的同事占用，同一公司不同业务员需使用不同的UN号。请选择其他UN号的走货实例后再申请。`,
              code: 'DUPLICATE_UN_NUMBER', un_number: myUn,
            });
          }
        }
      }

      await db('dg_agents').where({ id }).update({ status: action });
      logAudit({ action: 'dg_agent_' + action, target_type: 'dg_agent', target_id: id, operator_id: req.user!.id });
      res.json({ message: action === 'approved' ? '已通过' : '已驳回' });
    } catch (err) { next(err); }
  },

  // ════════════════════════════════════════════
  // 二、走货实例（支持 type 过滤 + checklist + port）
  // ════════════════════════════════════════════

  async cases(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as string) || 'air';
      const data = await db('dg_cases').where({ 'dg_cases.status': 'approved', type: type })
        .leftJoin('users', 'dg_cases.created_by', 'users.id')
        .select(
          'dg_cases.id', 'dg_cases.agent_name', 'dg_cases.title', 'dg_cases.content',
          'dg_cases.un_number', 'dg_cases.awb_number', 'dg_cases.file_paths',
          'dg_cases.checklist', 'dg_cases.port', 'dg_cases.type',
          'dg_cases.status', 'dg_cases.created_by', 'dg_cases.created_at',
          'users.display_name as submitter_name',
        )
        .orderBy('dg_cases.created_at', 'desc').limit(50);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async addCase(req: Request, res: Response, next: NextFunction) {
    try {
      const { agent_name, title, content, un_number, awb_number, file_paths, type, checklist, port } = req.body;
      if (!title || !content) return res.status(400).json({ error: '请填写标题和内容' });
      if (!un_number) return res.status(400).json({ error: '请填写UN编号' });

      const id = uuidv4();
      await db('dg_cases').insert({
        id, agent_name: agent_name || null, title, content,
        un_number: (un_number || '').toUpperCase().trim(),
        awb_number: awb_number || null, port: port || null,
        file_paths: file_paths ? JSON.stringify(file_paths) : null,
        checklist: checklist ? JSON.stringify(checklist) : null,
        type: type || 'air', status: 'approved', created_by: req.user!.id,
      });

      // 通知管理员有新增走货实例（仅通知，不需审核）
      const admins = await db('users').where({ role: 'admin' }).select('id');
      const submitter = await db('users').where({ id: req.user!.id }).first() as any;
      for (const admin of admins) {
        try { await db('messages').insert({ id: uuidv4(), sender_id: req.user!.id, receiver_id: admin.id, content: `📦 新走货实例已发布\n\n${submitter?.company_name || ''} ${submitter?.display_name || ''} 提交了新的走货实例：${title}\nUN编号：${(un_number || '').toUpperCase()}\n\n如有问题可直接联系提交人沟通。`, is_read: false, created_at: new Date().toISOString() }); } catch {}
      }

      res.status(201).json({ message: '✅ 走货实例已发布！' });
    } catch (err) { next(err); }
  },

  async uploadCaseFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return res.status(400).json({ error: '请选择文件上传' });
      res.json({ filePath: req.file.path });
    } catch (err) { next(err); }
  },

  async allCases(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as string) || 'air';
      const data = await db('dg_cases').where({ type })
        .leftJoin('users', 'dg_cases.created_by', 'users.id')
        .select(
          'dg_cases.id', 'dg_cases.agent_name', 'dg_cases.title', 'dg_cases.content',
          'dg_cases.un_number', 'dg_cases.awb_number', 'dg_cases.file_paths',
          'dg_cases.checklist', 'dg_cases.port', 'dg_cases.type',
          'dg_cases.status', 'dg_cases.created_by', 'dg_cases.created_at',
          'users.display_name as submitter_name',
        )
        .orderByRaw("CASE WHEN dg_cases.status='pending' THEN 0 ELSE 1 END")
        .orderBy('dg_cases.created_at', 'desc').limit(100);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async reviewCase(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, action } = req.body;
      if (!id || !['approved', 'rejected'].includes(action)) return res.status(400).json({ error: '参数不完整' });
      await db('dg_cases').where({ id }).update({
        status: action, approved_by: action === 'approved' ? req.user!.id : null, processed_at: db.fn.now(),
      });
      logAudit({ action: 'dg_case_' + action, target_type: 'dg_case', target_id: id, operator_id: req.user!.id });
      res.json({ message: action === 'approved' ? '已发布' : '已驳回' });
    } catch (err) { next(err); }
  },

  // ════════════════════════════════════════════
  // 三、危险品知识
  // ════════════════════════════════════════════

  async knowledge(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('dg_knowledge').orderBy('sort_order', 'asc').orderBy('created_at', 'desc');
      res.json({ data });
    } catch (err) { next(err); }
  },

  async saveKnowledge(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, title, content, sort_order } = req.body;
      if (!title || !content) return res.status(400).json({ error: '请填写标题和内容' });
      if (id) { await db('dg_knowledge').where({ id }).update({ title, content, sort_order: sort_order ?? 0, updated_at: db.fn.now() }); }
      else { await db('dg_knowledge').insert({ id: uuidv4(), title, content, sort_order: sort_order ?? 0, created_by: req.user!.id }); }
      res.json({ message: '保存成功' });
    } catch (err) { next(err); }
  },

  async deleteKnowledge(req: Request, res: Response, next: NextFunction) {
    try { await db('dg_knowledge').where({ id: req.params.id }).delete(); res.json({ message: '已删除' }); } catch (err) { next(err); }
  },

  // ════════════════════════════════════════════
  // 四、FAQ（支持 type 过滤）
  // ════════════════════════════════════════════

  async faqs(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as string) || 'air';
      const data = await db('dg_faqs')
        .leftJoin('users', 'dg_faqs.answered_by', 'users.id')
        .where({ 'dg_faqs.status': 'approved', 'dg_faqs.type': type })
        .select('dg_faqs.*', 'users.display_name as answerer_name')
        .orderBy('dg_faqs.created_at', 'desc').limit(50);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async addFaq(req: Request, res: Response, next: NextFunction) {
    try {
      const { question, type } = req.body;
      if (!question?.trim()) return res.status(400).json({ error: '请输入问题' });
      await db('dg_faqs').insert({ id: uuidv4(), question: question.trim(), type: type || 'air', status: 'pending', created_by: req.user!.id });
      res.status(201).json({ message: '问题已提交，等待管理员回答' });
    } catch (err) { next(err); }
  },

  async allFaqs(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as string) || 'air';
      const data = await db('dg_faqs')
        .leftJoin('users', 'dg_faqs.answered_by', 'users.id')
        .where({ 'dg_faqs.type': type })
        .select('dg_faqs.*', 'users.display_name as answerer_name')
        .orderByRaw("CASE WHEN dg_faqs.status='pending' THEN 0 ELSE 1 END")
        .orderBy('dg_faqs.created_at', 'desc').limit(100);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async answerFaq(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, answer } = req.body;
      if (!id || !answer?.trim()) return res.status(400).json({ error: '请填写回答内容' });
      const isAgent = await db('dg_agents').where({ created_by: req.user!.id, status: 'approved' }).first();
      const isAdminUser = req.user?.role === 'admin';
      if (!isAgent && !isAdminUser) {
        return res.status(403).json({ error: '仅已入驻的危险品代理可回答问题' });
      }
      await db('dg_faqs').where({ id }).update({ answer: answer.trim(), status: 'approved', answered_by: req.user!.id, answered_at: db.fn.now() });
      res.json({ message: '已回答并发布' });
    } catch (err) { next(err); }
  },

  async deleteFaq(req: Request, res: Response, next: NextFunction) {
    try { await db('dg_faqs').where({ id: req.params.id }).delete(); res.json({ message: '已删除' }); } catch (err) { next(err); }
  },


  // ════════════════════════════════════════════
  // 五、统计数据（管理员）
  // ════════════════════════════════════════════

  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as string) || 'air';
      const [totalCases, pendingCases, totalAgents, pendingAgents, totalFaqs, pendingFaqs] = await Promise.all([
        db('dg_cases').where({ type, status: 'approved' }).count('* as total').first(),
        db('dg_cases').where({ type, status: 'pending' }).count('* as total').first(),
        db('dg_agents').where({ type, status: 'approved' }).count('* as total').first(),
        db('dg_agents').where({ type, status: 'pending' }).count('* as total').first(),
        db('dg_faqs').where({ type, status: 'approved' }).count('* as total').first(),
        db('dg_faqs').where({ type, status: 'pending' }).count('* as total').first(),
      ]);
      res.json({
        cases: { total: Number((totalCases as any)?.total || 0), pending: Number((pendingCases as any)?.total || 0) },
        agents: { total: Number((totalAgents as any)?.total || 0), pending: Number((pendingAgents as any)?.total || 0) },
        faqs: { total: Number((totalFaqs as any)?.total || 0), pending: Number((pendingFaqs as any)?.total || 0) },
      });
    } catch (err) { next(err); }
  },
};
