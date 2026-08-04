import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authRequired } from '../middleware/auth.middleware';
import db from '../config/database';

const router = Router();
router.use(authRequired);

// ── 列表（支持筛选） ──
router.get('/', async (req, res) => {
  try {
    const { status, country, port, page: p, limit: l } = req.query;
    const page = Math.max(1, parseInt(p as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(l as string) || 20));
    const offset = (page - 1) * limit;

    let q = db('consignees');
    if (status) q = q.where('status', status as string);
    if (country) q = q.where('country', country as string);
    if (port) q = q.where('port', 'like', `%${port}%`);

    const total = Number(((await q.clone().count('* as total').first()) as any)?.total || 0);
    const data = await q.orderBy('import_frequency', 'desc').orderBy('last_import_date', 'desc').limit(limit).offset(offset);

    res.json({ data, total, page, limit });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── 批量导入 ──
router.post('/import', async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: '请提供数据' });
    }
    let inserted = 0;
    for (const r of records.slice(0, 500)) {
      if (!r.company_name) continue;
      // 去重
      const exists = await db('consignees').where({ company_name: r.company_name, country: r.country }).first();
      if (exists) continue;
      await db('consignees').insert({
        id: uuidv4(),
        company_name: r.company_name.substring(0, 300),
        country: (r.country || '').substring(0, 100),
        port: (r.port || '').substring(0, 10),
        contact_email: (r.contact_email || '').substring(0, 200),
        contact_phone: (r.contact_phone || '').substring(0, 50),
        contact_person: (r.contact_person || '').substring(0, 100),
        import_frequency: parseInt(r.import_frequency) || 0,
        last_import_date: r.last_import_date || null,
        cargo_types: (r.cargo_types || '').substring(0, 500),
        status: 'dormant',
        notes: (r.notes || '').substring(0, 2000),
        created_at: new Date().toISOString(),
      });
      inserted++;
    }
    res.json({ message: `成功导入 ${inserted} 条记录`, inserted });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── 唤醒池（仅付费会员/管理员可见） ──
router.get('/pool', async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await db('users').where({ id: userId }).first() as any;
    const isPremium = user?.role === 'admin' || user?.plan_tier === 'standard' || user?.plan_tier === 'enterprise';

    if (!isPremium) {
      return res.json({
        data: [], total: 0, premium: false,
        message: '此功能仅对付费会员开放。升级标准版或企业版即可查看海外直客唤醒池。',
      });
    }

    const { country, port, page: p, limit: l } = req.query;
    const page = Math.max(1, parseInt(p as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(l as string) || 10));
    const offset = (page - 1) * limit;

    let q = db('consignees').where('status', '!=', 'invalid');
    if (country) q = q.where('country', country as string);
    if (port) q = q.where('port', 'like', `%${port}%`);

    const total = Number(((await q.clone().count('* as total').first()) as any)?.total || 0);
    const rows = await q.orderBy('import_frequency', 'desc').orderBy('last_import_date', 'desc').limit(limit).offset(offset) as any[];

    const now = new Date();
    const data = rows.map((r: any) => {
      const isProtected = r.protection_until && new Date(r.protection_until) > now;
      const isMine = r.claimed_by === userId;
      return {
        ...r,
        contact_email: (isMine || !isProtected) ? r.contact_email : '***@***.***',
        contact_phone: (isMine || !isProtected) ? r.contact_phone : '***',
        contact_person: r.contact_person,
        isProtected,
        isMine,
        protectionRemaining: isProtected ? Math.ceil((new Date(r.protection_until).getTime() - now.getTime()) / 3600000) : 0,
      };
    });

    res.json({ data, total, page, limit, premium: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── 认领/锁定直客 ──
router.post('/:id/claim', async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await db('users').where({ id: userId }).first() as any;
    const tier = user?.plan_tier || 'free';
    // 保护期时长：旗舰72h，专业24h，管理员1h
    const protectionHours = tier === 'enterprise' ? 72 : tier === 'standard' ? 24 : 1;

    const record = await db('consignees').where({ id: req.params.id }).first() as any;
    if (!record) return res.status(404).json({ error: '记录不存在' });

    const now = new Date();
    // 检查是否在保护期内且不是自己的
    if (record.protection_until && new Date(record.protection_until) > now && record.claimed_by !== userId) {
      const remaining = Math.ceil((new Date(record.protection_until).getTime() - now.getTime()) / 3600000);
      return res.status(403).json({ error: `该直客已被锁定，${remaining}小时后解锁`, protectionRemaining: remaining });
    }

    const protectionUntil = new Date(now.getTime() + protectionHours * 3600000);
    await db('consignees').where({ id: record.id }).update({
      claimed_by: userId,
      claimed_at: now.toISOString(),
      protection_until: protectionUntil.toISOString(),
      status: record.status === 'dormant' ? 'claimed' : record.status,
    });

    res.json({
      message: `已锁定！${protectionHours}小时内独占此直客`,
      protectionUntil: protectionUntil.toISOString(),
      protectionHours,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── 标记为已唤醒 ──
router.post('/:id/awaken', async (req, res) => {
  try {
    const userId = req.user!.id;
    const record = await db('consignees').where({ id: req.params.id }).first() as any;
    if (!record) return res.status(404).json({ error: '记录不存在' });
    if (record.claimed_by !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: '只能标记自己锁定的直客' });
    }
    await db('consignees').where({ id: record.id }).update({
      status: 'awakened',
      awakened_at: new Date().toISOString(),
      awakened_by: userId,
    });

    // 更新联系记录
    try {
      const count = await db('consignees').where({ awakened_by: userId }).count('* as total').first() as any;
      res.json({ message: '已标记为唤醒成功！', totalAwakened: Number(count?.total || 0) });
    } catch { res.json({ message: '已标记为唤醒成功！' }); }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── 统计 ──
router.get('/stats', async (_req, res) => {
  try {
    const total = await db('consignees').count('* as total').first() as any;
    const dormant = await db('consignees').where('status', 'dormant').count('* as total').first() as any;
    const claimed = await db('consignees').where('status', 'claimed').count('* as total').first() as any;
    const awakened = await db('consignees').where('status', 'awakened').count('* as total').first() as any;
    const countries = await db('consignees').distinct('country').count('* as total').first() as any;

    res.json({
      total: Number(total?.total || 0),
      dormant: Number(dormant?.total || 0),
      claimed: Number(claimed?.total || 0),
      awakened: Number(awakened?.total || 0),
      countries: Number(countries?.total || 0),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
