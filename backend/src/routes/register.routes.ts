import { Router } from 'express';
import { registerController } from '../controllers/register.controller';
import { cardUpload } from '../middleware/cardUpload.middleware';
import { registerLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Public registration - uses card image upload (not file upload)
router.post('/', registerLimiter, cardUpload.fields([
  { name: 'card_image', maxCount: 1 },
  { name: 'license_image', maxCount: 1 },
]), registerController.register);

export default router;
