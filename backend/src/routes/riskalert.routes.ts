import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { riskAlertController } from '../controllers/riskalert.controller';

const router = Router();

router.use(authRequired);
router.get('/pending', riskAlertController.pending);
router.get('/history', riskAlertController.history);
router.get('/approved', riskAlertController.approved);
router.post('/:id/approve', riskAlertController.approve);
router.post('/:id/reject', riskAlertController.reject);

export default router;
