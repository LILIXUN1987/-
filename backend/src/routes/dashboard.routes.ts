import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { dashboardController } from '../controllers/dashboard.controller';

const router = Router();

router.get('/', authRequired, dashboardController.index);

export default router;
