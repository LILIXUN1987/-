import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { authRequired, authOptional } from '../middleware/auth.middleware';

const router = Router();

// ── 查询口岸服务（公开） ──
router.get('/', authOptional, async (req, res) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string' || code.trim().length < 1) {
      return res.json({ data: [], customsBrokers: [], trucking: [], insurance: [], inspection: [], lawyers: [], total: 0 });
    }

    const raw = code.trim();
    const terms = raw.split(/[\s+\/]/).filter(Boolean);
    const rawQ = `%${raw}%`;
    const rawUpper = `%${raw.toUpperCase()}%`;

    const data = await db('port_services')
      .leftJoin('users', 'port_services.submitted_by', 'users.id')
      .where({ 'port_services.status': 'approved' })
      .andWhere(function () {
        // 方案A：整句匹配（"广州报关" 无空格也能匹配）
        this.where('port_services.port_code', 'like', rawUpper)
          .orWhere('port_services.port_name', 'like', rawQ)
          .orWhere('port_services.service_type', 'like', rawQ)
          .orWhere('port_services.company_name', 'like', rawQ)
          .orWhere('port_services.description', 'like', rawQ);

        // 方案B：分词匹配（"广州 报关" / "LAX+truck" — 所有词 AND 连接）
        if (terms.length > 1) {
          this.orWhere(function () {
            for (const term of terms) {
              const q = `%${term}%`;
              const qUpper = `%${term.toUpperCase()}%`;
              this.andWhere(function () {
                this.where('port_services.port_code', 'like', qUpper)
                  .orWhere('port_services.port_name', 'like', q)
                  .orWhere('port_services.service_type', 'like', q)
                  .orWhere('port_services.company_name', 'like', q)
                  .orWhere('port_services.description', 'like', q);
              });
            }
          });
        }
      })
      .select(
        'port_services.*',
        'users.display_name as submitter_name',
        'users.company_name as submitter_company',
        'users.card_image as submitter_card',
        'users.created_at as submitter_created_at',
      )
      .orderBy('port_services.created_at', 'desc')
      .limit(100);

    // 信任信息
    const enriched = data.map((row: any) => {
      const daysSinceReg = row.submitter_created_at
        ? Math.floor((Date.now() - new Date(row.submitter_created_at).getTime()) / 86400000)
        : 0;
      return { ...row, trust_info: { has_card: !!row.submitter_card, days_since_reg: daysSinceReg, submitter_name: row.submitter_name, submitter_company: row.submitter_company } };
    });

    // 按服务类型分组
    const groups: Record<string, string> = { customsBrokers: '报关行', trucking: '车队', insurance: '运输保险', inspection: '检测认证', lawyers: '律师' };
    const result: Record<string, any[]> = {};
    for (const [key, type] of Object.entries(groups)) {
      result[key] = enriched.filter((r: any) => r.service_type.includes(type));
    }

    res.json({ data: enriched, customsBrokers: result.customsBrokers, trucking: result.trucking, insurance: result.insurance, inspection: result.inspection, lawyers: result.lawyers, total: enriched.length });
  } catch (err) { res.status(500).json({ error: '服务器错误' }); }
});

// ── 提交口岸服务（防重复） ──
router.post('/', authRequired, async (req, res) => {
  try {
    const { port_code, port_name, service_type, company_name, contact_person, phone, description } = req.body;
    if (!port_code?.trim() || !service_type?.trim() || !company_name?.trim()) {
      return res.status(400).json({ error: '请填写口岸代码、服务类型和公司名称' });
    }

    const existing = await db('port_services').where({ submitted_by: req.user!.id, port_code: port_code.trim().toUpperCase(), company_name: company_name.trim(), service_type: service_type.trim() }).first();
    if (existing) {
      return res.status(400).json({ error: '您已提交过该口岸的相同服务信息，请勿重复提交', code: 'DUPLICATE' });
    }

    await db('port_services').insert({
      id: uuidv4(), port_code: port_code.trim().toUpperCase(), port_name: port_name?.trim() || null,
      service_type: service_type.trim(), company_name: company_name.trim(),
      contact_person: contact_person?.trim() || null, phone: phone?.trim() || null,
      description: description?.trim() || null, submitted_by: req.user!.id, status: 'approved',
    });

    res.status(201).json({ message: '✅ 口岸服务信息已提交，感谢分享！' });
  } catch (err) { res.status(500).json({ error: '服务器错误' }); }
});

// ── 我的提交列表 ──
router.get('/my-submissions', authRequired, async (req, res) => {
  try {
    const data = await db('port_services').where({ submitted_by: req.user!.id }).orderBy('created_at', 'desc').limit(50);
    res.json({ data });
  } catch (err) { res.status(500).json({ error: '服务器错误' }); }
});

// ── 删除我的提交 ──
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const item = await db('port_services').where({ id: req.params.id }).first() as any;
    if (!item) return res.status(404).json({ error: '记录不存在' });
    if (item.submitted_by !== req.user!.id) {
      const user = await db('users').where({ id: req.user!.id }).first() as any;
      if (user?.role !== 'admin') return res.status(403).json({ error: '无权限' });
    }
    await db('port_services').where({ id: req.params.id }).delete();
    res.json({ message: '已删除' });
  } catch (err) { res.status(500).json({ error: '服务器错误' }); }
});

export default router;
