import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authRequired, authOptional } from '../middleware/auth.middleware';
import { apiKeyAuth } from '../middleware/apiKeyAuth.middleware';
import { requireActiveTrial } from '../middleware/trialCheck.middleware';
import { cargoController } from '../controllers/cargo.controller';
import { searchLimiter, parseLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// 文件上传配置（搜索附箱单）
const searchUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, './uploads'),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `search-${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// 查询类路由 — 不拦截过期货代
router.get('/', authOptional, cargoController.list);
router.get('/search-by-category', authOptional, cargoController.searchByCategory);
router.post('/search-by-category', authOptional, searchUpload.single('file'), cargoController.searchByCategory);
router.get('/stats', authOptional, cargoController.stats);
router.get('/my-stats', authRequired, cargoController.myStats);
router.get('/my-publications', authRequired, cargoController.myPublications);
router.get('/trending', cargoController.trending);
router.get('/my-air-items', authOptional, cargoController.myAirItems);

// 数据录入类路由 — 拦截过期货代
router.post('/parse-text', parseLimiter, authRequired, requireActiveTrial, cargoController.parseText);

// ── 批量导入运价（支持 API Key 或 JWT） ──
router.post('/batch-import', apiKeyAuth, cargoController.batchImport);

// ── 📋 需求看板（未匹配的需求，货代可主动报价） ──
router.get('/demand-board', authOptional, async (req, res) => {
  try {
    const db = (await import('../config/database')).default;
    const demands = await db('demand_records')
      .where('notified', 0)
      .where('created_at', '>=', new Date(Date.now() - 7 * 86400000).toISOString())
      .select('id', 'user_id', 'keyword', 'category', 'origin_port', 'dest_port', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(50) as any[];
    // 附上搜索者信息
    const userIds = [...new Set(demands.filter((d: any) => d.user_id).map((d: any) => d.user_id))];
    const users = userIds.length > 0
      ? await db('users').whereIn('id', userIds).select('id', 'display_name', 'company_name') as any[]
      : [];
    const userMap: Record<string, any> = {};
    for (const u of users) userMap[u.id] = u;
    res.json({
      data: demands.map((d: any) => ({
        id: d.id, keyword: d.keyword, category: d.category,
        origin_port: d.origin_port, dest_port: d.dest_port,
        created_at: d.created_at,
        user: userMap[d.user_id] || null,
      })),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── 🚀 紧急填舱推广（仅货代可用） ──
router.post('/bulk-promote', authRequired, cargoController.bulkPromote);
// 查询支付状态
router.get('/bulk-promote/status/:orderId', authRequired, async (req, res) => {
  try {
    const db = (await import('../config/database')).default;
    const order = await db('bulk_promote_orders').where({ id: req.params.orderId }).first() as any;
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({ status: order.status, paid_at: order.paid_at });
  } catch (e: any) { res.status(500).json({ error: '查询失败' }); }
});

// ── 搜同行 · 找公司 ──
router.get('/search-users', authOptional, cargoController.searchUsers);
router.post('/inquiry-user', authRequired, cargoController.inquiryUser);

// ── 公开搜索（无需登录，返回脱敏数据） ──
router.get('/public-search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) return res.json({ data: [], total: 0 });

    const { default: db } = await import('../config/database');
    const rows = await db('cargo_spaces')
      .leftJoin('raw_messages', 'cargo_spaces.uploaded_file_id', 'raw_messages.id')
      .leftJoin('users', 'raw_messages.uploaded_by', 'users.id')
      .where('cargo_spaces.status', 'available')
      .where(function() {
        this.where('cargo_spaces.origin_port', 'like', `%${q}%`)
          .orWhere('cargo_spaces.dest_port', 'like', `%${q}%`)
          .orWhere('cargo_spaces.airline_code', 'like', `%${q}%`)
          .orWhere('cargo_spaces.notes', 'like', `%${q}%`)
          .orWhere('cargo_spaces.region', 'like', `%${q}%`);
      })
      .select(
        'cargo_spaces.origin_port', 'cargo_spaces.dest_port', 'cargo_spaces.airline_code',
        'cargo_spaces.notes', 'cargo_spaces.created_at', 'cargo_spaces.region',
        'cargo_spaces.price_per_cbm', 'cargo_spaces.price_per_kg',
        'users.company_name', 'users.is_newbie'
      )
      .orderBy('cargo_spaces.created_at', 'desc')
      .limit(20) as any[];

    // 脱敏: 公司名只显示前10字，不返回联系人
    const data = rows.map((r: any) => ({
      ...r,
      company_name: r.company_name || null,
      is_newbie: !!r.is_newbie,
    }));

    // 近24h该港口搜索动态
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const activities = await db('search_logs')
      .where('keyword', 'like', `%${q}%`)
      .where('created_at', '>=', yesterday)
      .orderBy('created_at', 'desc')
      .limit(10) as any[];
    const searcherCount = activities.length;
    // 查是否有认证用户搜索过
    const certifiedSearch = activities.some((a: any) => a.user_id);

    res.json({
      data,
      total: data.length,
      activity: {
        recentSearches: searcherCount,
        hasCertifiedSearcher: certifiedSearch,
        sampleActivities: activities.slice(0, 3).map((a: any) => ({
          keyword: a.keyword?.substring(0, 30),
          time: a.created_at,
        })),
      },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── 反向匹配：货代搜潜在客户 ──
router.get('/match-searchers', authRequired, cargoController.matchSearchers);

// 单条记录操作
router.get('/:id', authOptional, cargoController.getById);
router.put('/:id', authRequired, requireActiveTrial, cargoController.update);
router.delete('/:id', authRequired, requireActiveTrial, cargoController.delete);

// ── 导出报价单 ──
router.get('/:id/export-quote', authRequired, cargoController.exportQuote);

export default router;
