import { Router } from 'express';
import { registerController } from '../controllers/register.controller';
import { cardUpload } from '../middleware/cardUpload.middleware';
import { registerLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Public registration - uses card image upload (not file upload)
router.post('/', registerLimiter, cardUpload.single('card_image'), registerController.register);

export default router;
