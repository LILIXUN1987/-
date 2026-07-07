import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { reviewsController } from '../controllers/reviews.controller';

const router = Router();

router.use(authRequired);
router.post('/', reviewsController.create);
router.get('/stats/:userId', reviewsController.stats);

export default router;
