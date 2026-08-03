import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { directoryController } from '../controllers/directory.controller';

const router = Router();

router.use(authRequired);

router.get('/inspectors', directoryController.inspectors);
router.get('/insurers', directoryController.insurers);

export default router;
