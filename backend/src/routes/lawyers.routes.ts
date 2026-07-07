import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { lawyersController } from '../controllers/lawyers.controller';

const router = Router();

router.use(authRequired);
router.get('/', lawyersController.list);

export default router;
