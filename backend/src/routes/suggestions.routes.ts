import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { suggestionsController } from '../controllers/suggestions.controller';

const router = Router();

router.use(authRequired);
router.get('/', suggestionsController.list);
router.post('/', suggestionsController.create);
router.delete('/:id', suggestionsController.delete);

export default router;
