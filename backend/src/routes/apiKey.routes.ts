import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { apiKeyController } from '../controllers/apiKey.controller';

const router = Router();

router.use(authRequired);
router.get('/', apiKeyController.list);
router.post('/', apiKeyController.create);
router.delete('/:id', apiKeyController.revoke);

export default router;
