import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authRequired } from '../middleware/auth.middleware';
import db from '../config/database';

const router = Router();
router.use(authRequired);

// ── 提交悬赏线索 ──
router.post('/submit', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { company_name, country, city, pod, goods_guess } = req.body;
    if (!company_name?.trim()) return res.status(400).json({ error: '请填写公司名称' });

    const id = uuidv4();
    await db('bounty_leads').insert({
      id, submitter_uid: userId,
      company_name: company_name.trim().substring(0, 300),
      country: (country || '').substring(0, 100),
      city: (city || '').substring(0, 100),
      pod: (pod || '').toUpperCase().substring(0, 20),
      goods_guess: (goods_guess || '').substring(0, 200),
      status: 'pending', confidence_score: null,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({ message: '线索已提交，等待核验', id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── 我的悬赏记录 ──
router.get('/my-leads', async (req, res) => {
  try {
    const userId = req.user!.id;
    const leads = await db('bounty_leads').where({ submitter_uid: userId }).orderBy('created_at', 'desc').limit(50);
    // 查账户
    let account = await db('user_account').where({ uid: userId }).first() as any;
    if (!account) {
      await db('user_account').insert({ uid: userId, pending_cash: 0, total_earned: 0, created_at: new Date().toISOString() });
      account = { pending_cash: 0, total_earned: 0 };
    }
    res.json({
      data: leads,
      pending_cash: Number(account?.pending_cash || 0),
      total_earned: Number(account?.total_earned || 0),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── 管理员：待核验列表 ──
router.get('/pending', async (req, res) => {
  try {
    if (req.user!.role !== 'admin') return res.status(403).json({ error: '仅管理员' });
    const leads = await db('bounty_leads').where({ status: 'pending' }).orderBy('created_at', 'desc').limit(50);
    res.json({ data: leads });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── 管理员：核验线索 ──
router.post('/verify/:id', async (req, res) => {
  try {
    if (req.user!.role !== 'admin') return res.status(403).json({ error: '仅管理员' });
    const lead = await db('bounty_leads').where({ id: req.params.id }).first() as any;
    if (!lead || lead.status !== 'pending') return res.status(400).json({ error: '线索状态异常' });

    const { action } = req.body; // 'approve' | 'reject'
    if (action === 'reject') {
      await db('bounty_leads').where({ id: lead.id }).update({ status: 'rejected' });
      return res.json({ message: '已拒绝' });
    }

    // 核验通过：+30 冻结
    await db('bounty_leads').where({ id: lead.id }).update({ status: 'verified', confidence_score: 0.8 });

    let account = await db('user_account').where({ uid: lead.submitter_uid }).first() as any;
    if (!account) {
      await db('user_account').insert({ uid: lead.submitter_uid, pending_cash: 30, total_earned: 30, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    } else {
      await db('user_account').where({ uid: lead.submitter_uid }).update({
        pending_cash: Number(account.pending_cash) + 30,
        total_earned: Number(account.total_earned) + 30,
        updated_at: new Date().toISOString(),
      });
    }

    await db('financial_ledger').insert({
      id: uuidv4(), uid: lead.submitter_uid, delta: 30, type: 'bounty_verify',
      description: `线索 ${lead.company_name} 核验通过，冻结奖励 30 元`,
      created_at: new Date().toISOString(),
    });

    // 通知提交者
    try {
      await db('messages').insert({
        id: uuidv4(), sender_id: req.user!.id, receiver_id: lead.submitter_uid,
        content: `🎉 恭喜！您提交的线索「${lead.company_name}」已通过核验。\n\n💰 +30元冻结奖金已记入您的账户。线索成交后积分解冻转为现金。`,
        is_read: false, created_at: new Date().toISOString(),
      });
    } catch {}

    res.json({ message: '已通过核验，+30元冻结' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── 管理员：标记互动/成交 ──
router.post('/progress/:id', async (req, res) => {
  try {
    if (req.user!.role !== 'admin') return res.status(403).json({ error: '仅管理员' });
    const lead = await db('bounty_leads').where({ id: req.params.id }).first() as any;
    if (!lead) return res.status(404).json({ error: '线索不存在' });

    const { action } = req.body;
    if (action === 'engaged' && lead.status === 'verified') {
      await db('bounty_leads').where({ id: lead.id }).update({ status: 'engaged' });
      let account = await db('user_account').where({ uid: lead.submitter_uid }).first() as any;
      if (account) {
        await db('user_account').where({ uid: lead.submitter_uid }).update({
          pending_cash: Number(account.pending_cash) + 50,
          total_earned: Number(account.total_earned) + 50,
          updated_at: new Date().toISOString(),
        });
      }
      await db('financial_ledger').insert({
        id: uuidv4(), uid: lead.submitter_uid, delta: 50, type: 'bounty_engage',
        description: `线索 ${lead.company_name} 已互动，冻结奖励 50 元`,
        created_at: new Date().toISOString(),
      });
      return res.json({ message: '已标记互动，+50元冻结' });
    }

    if (action === 'converted' && (lead.status === 'verified' || lead.status === 'engaged')) {
      await db('bounty_leads').where({ id: lead.id }).update({ status: 'converted' });
      // 解冻转为实际收入（暂记录为payout类型，实际打款需人工操作）
      let account = await db('user_account').where({ uid: lead.submitter_uid }).first() as any;
      const amount = Number(account?.pending_cash || 0);
      if (account && amount > 0) {
        await db('user_account').where({ uid: lead.submitter_uid }).update({
          pending_cash: 0,
          updated_at: new Date().toISOString(),
        });
        await db('financial_ledger').insert({
          id: uuidv4(), uid: lead.submitter_uid, delta: -amount, type: 'bounty_convert',
          description: `线索 ${lead.company_name} 成交，${amount}元待结算转可提现`,
          created_at: new Date().toISOString(),
        });
      }
      return res.json({ message: `已成交，${amount}元待打款` });
    }

    res.status(400).json({ error: '无效操作' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
