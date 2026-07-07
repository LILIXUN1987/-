import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import { getAuditLogs } from '../services/audit.service';

const router = Router();
router.use(authRequired, requireAdmin);

// 获取审核日志列表
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, action, target_type } = req.query;
    const result = await getAuditLogs(
      parseInt(page as string) || 1,
      parseInt(limit as string) || 50,
      { action: action as string, target_type: target_type as string },
    );
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
