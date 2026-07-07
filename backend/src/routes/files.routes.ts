import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { requireActiveTrial } from '../middleware/trialCheck.middleware';
import { upload } from '../middleware/upload.middleware';
import { filesController } from '../controllers/files.controller';

const router = Router();

// All file routes require authentication
router.use(authRequired);

router.get('/', filesController.list);
router.post('/upload', requireActiveTrial, upload.single('file'), filesController.upload);
router.get('/:id', filesController.getById);
router.get('/:id/download', filesController.download);
router.get('/:id/downloaders', filesController.downloaders);
router.delete('/:id', requireActiveTrial, filesController.delete);

export default router;
