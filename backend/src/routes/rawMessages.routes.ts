import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { rawMessagesController } from '../controllers/rawMessages.controller';

const router = Router();

router.use(authRequired);
router.get('/', rawMessagesController.list);
router.get('/:id/cargo', rawMessagesController.getLinkedCargo);
router.get('/:id/content', rawMessagesController.getRawContent);
router.post('/export', rawMessagesController.export);
router.delete('/', rawMessagesController.delete);

export default router;
