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

export default router;
