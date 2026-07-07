import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { favoritesController } from '../controllers/favorites.controller';

const router = Router();

router.use(authRequired);
router.post('/toggle', favoritesController.toggle);
router.get('/list', favoritesController.list);
router.get('/status', favoritesController.status);
router.get('/batch-status', favoritesController.batchStatus);

export default router;
