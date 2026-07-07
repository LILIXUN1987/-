import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { cooperationController } from '../controllers/cooperation.controller';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

router.use(authRequired);

router.post('/', cooperationController.create);
router.post('/:id/confirm', cooperationController.confirm);
router.get('/my-partners', cooperationController.myPartners);
router.get('/credit-score/:userId', cooperationController.creditScore);

export default router;
