import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { authRequired, authOptional } from '../middleware/auth.middleware';

const router = Router();

// ── 导航列表（公开，无需登录） ──
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = db('nav_links').where({ status: 'approved' });

    if (category && typeof category === 'string') {
      query = query.where({ category });
    }
    if (search && typeof search === 'string') {
      const kw = `%${search.trim()}%`;
      query = query.where(function () {
        this.where('title', 'like', kw).orWhere('description', 'like', kw).orWhere('url', 'like', kw);
      });
    }

    const data = await query.orderBy('vote_count', 'desc').orderBy('created_at', 'desc').limit(200);

    // 分类统计
    const categories = await db('nav_links').where({ status: 'approved' }).select('category').count('* as count').groupBy('category').orderBy('count', 'desc');
    const total = await db('nav_links').where({ status: 'approved' }).count('* as total').first();

    res.json({ data, categories, total: Number((total as any)?.total || 0) });
  } catch (err) { res.status(500).json({ error: '服务器错误' }); }
});

// ── 分类列表 ──
router.get('/categories', async (_req, res) => {
  try {
    const data = await db('nav_links').where({ status: 'approved' }).select('category').count('* as count').groupBy('category').orderBy('count', 'desc');
    res.json({ data });
  } catch (err) { res.status(500).json({ error: '服务器错误' }); }
});

// ── 提交新链接（需登录，奖励+3天） ──
router.post('/', authRequired, async (req, res) => {
  try {
    const { title, url, category, description } = req.body;
    if (!title?.trim() || !url?.trim() || !category?.trim()) {
      return res.status(400).json({ error: '请填写标题、网址和分类' });
    }

    // 检查是否已存在
    const existing = await db('nav_links')
      .where({ url: url.trim() })
      .orWhere('title', title.trim())
      .first();
    if (existing) {
      return res.status(400).json({ error: '该链接或标题已存在，请勿重复提交', code: 'DUPLICATE_LINK' });
    }

    await db('nav_links').insert({
      id: uuidv4(),
      title: title.trim(),
      url: url.trim(),
      category: category.trim(),
      description: description?.trim() || null,
      submitted_by: req.user!.id,
      status: 'pending',
    });

    res.status(201).json({ message: '✅ 链接已提交，等待管理员审核，审核通过后发放奖励！' });
  } catch (err) { res.status(500).json({ error: '服务器错误' }); }
});


// ── 待审核列表（管理员） ──
router.get("/pending", authRequired, async (req, res) => {
  try {
    const user = await db("users").where({ id: req.user!.id }).first() as any;
    if (user?.role !== "admin") return res.status(403).json({ error: "仅管理员可操作" });
    const data = await db("nav_links")
      .leftJoin("users", "nav_links.submitted_by", "users.id")
      .where({ "nav_links.status": "pending" })
      .select("nav_links.*", "users.display_name as submitter_name", "users.company_name as submitter_company")
      .orderBy("nav_links.created_at", "asc").limit(50);
    const total = await db("nav_links").where({ status: "pending" }).count("* as total").first();
    res.json({ data, total: Number((total as any)?.total || 0) });
  } catch (err) { res.status(500).json({ error: "服务器错误" }); }
});

// ── 审核链接（管理员：批准/驳回） ──
router.post("/:id/review", authRequired, async (req, res) => {
  try {
    const user = await db("users").where({ id: req.user!.id }).first() as any;
    if (user?.role !== "admin") return res.status(403).json({ error: "仅管理员可操作" });
    const { action } = req.body;
    if (!["approved", "rejected"].includes(action)) return res.status(400).json({ error: "参数不完整" });
    const link = await db("nav_links").where({ id: req.params.id }).first() as any;
    if (!link) return res.status(404).json({ error: "链接不存在" });
    await db("nav_links").where({ id: req.params.id }).update({ status: action });
    if (action === "approved" && link.submitted_by) {
      const submitter = await db("users").where({ id: link.submitted_by }).first() as any;
      if (submitter) {
        const currentEnd = submitter.trial_end ? new Date(submitter.trial_end + "T23:59:59") : new Date();
        const now = new Date();
        const newEnd = currentEnd > now ? currentEnd : now;
        newEnd.setDate(newEnd.getDate() + 3);
        await db("users").where({ id: link.submitted_by }).update({ trial_end: newEnd.toISOString().split("T")[0] });
      }
    }
    res.json({ message: action === "approved" ? "✅ 已通过，奖励已发放" : "已驳回" });
  } catch (err) { res.status(500).json({ error: "服务器错误" }); }
});

// ── 点赞 ──
router.post('/:id/vote', authRequired, async (req, res) => {
  try {
    await db('nav_links').where({ id: req.params.id }).increment('vote_count', 1);
    res.json({ message: '👍 已点赞' });
  } catch (err) { res.status(500).json({ error: '服务器错误' }); }
});

export default router;
