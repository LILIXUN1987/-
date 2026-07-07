import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { disputeController } from '../controllers/dispute.controller';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

router.use(authRequired);

router.post('/', disputeController.create);
router.get('/', disputeController.list);
router.post('/:id/resolve', requireAdmin, disputeController.resolve);

export default router;
