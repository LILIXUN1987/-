import { Router } from 'express';
import multer from 'multer';
import { authRequired } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import { adminController } from '../controllers/admin.controller';

const uploadExcel = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.use(authRequired);
router.use(requireAdmin); // 所有管理后台接口仅管理员可访问

router.get('/stats', adminController.stats);
router.get('/user-analytics', adminController.userAnalytics);

// 会员套餐管理
router.get('/plans', adminController.listPlans);
router.post('/plans/save', adminController.savePlan);
router.delete('/plans/:id', adminController.deletePlan);

// 手动续期
router.post('/renew', adminController.renewUser);
router.get('/renewal-records', adminController.renewalRecords);

// 用户列表
router.get('/users', adminController.userList);

// 企业认证管理
router.get('/company-verifications', adminController.companyVerifications);
router.post('/approve-verification', adminController.approveVerification);
router.post('/reject-verification', adminController.rejectVerification);

// 批量导入展会名片
router.post('/batch-import', uploadExcel.single('file'), adminController.batchImport);
router.get('/batch-imports', adminController.batchImportList);

// 标记用户邮箱为退件（之后不再发邮件）
router.post('/mark-email-bounced', authRequired, requireAdmin, async (req, res) => {
  try {
    const db = (await import('../config/database')).default;
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: '请提供邮箱' });
    await db('users').where({ email }).update({ email_bounced: 1 });
    res.json({ message: `已标记 ${email} 为退件，不再发送邮件` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 标记名片邮箱为退件/无效
router.post('/mark-bounced', authRequired, requireAdmin, async (req, res) => {
  try {
    const db = (await import('../config/database')).default;
    const { cardIds, reason } = req.body;
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ error: '请提供名片ID列表' });
    }
    await db('collected_cards').whereIn('id', cardIds).update({
      email_status: 'bounced',
      bounce_reason: (reason || '').substring(0, 100),
    });
    res.json({ message: `已标记 ${cardIds.length} 张名片为退件` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 运营详情：谁发布过/搜索过
router.get('/publish-stats', authRequired, requireAdmin, async (req, res) => {
  try {
    const db = (await import('../config/database')).default;
    // 发布过舱位的用户
    const publishers = await db('raw_messages')
      .join('users', 'raw_messages.uploaded_by', 'users.id')
      .select('users.id', 'users.display_name', 'users.company_name', 'users.role')
      .count('raw_messages.id as count')
      .max('raw_messages.created_at as last_at')
      .groupBy('users.id')
      .orderBy('count', 'desc')
      .limit(50) as any[];
    // 搜索过的用户
    const searchers = await db('search_logs')
      .join('users', 'search_logs.user_id', 'users.id')
      .select('users.id', 'users.display_name', 'users.company_name', 'users.role')
      .count('search_logs.id as count')
      .max('search_logs.created_at as last_at')
      .groupBy('users.id')
      .orderBy('count', 'desc')
      .limit(50) as any[];
    // 最近的搜索关键词
    const recentSearches = await db('search_logs')
      .join('users', 'search_logs.user_id', 'users.id')
      .select('search_logs.keyword', 'search_logs.category', 'search_logs.created_at', 'users.display_name', 'users.company_name')
      .whereNotNull('search_logs.keyword')
      .orderBy('search_logs.created_at', 'desc')
      .limit(30) as any[];
    // 最近的发布
    const recentPublishes = await db('raw_messages')
      .join('users', 'raw_messages.uploaded_by', 'users.id')
      .select('raw_messages.content', 'raw_messages.category', 'raw_messages.created_at', 'users.display_name', 'users.company_name')
      .orderBy('raw_messages.created_at', 'desc')
      .limit(30) as any[];

    res.json({ publishers, searchers, recentSearches, recentPublishes });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
