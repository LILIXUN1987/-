import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { expressInquiryController } from '../controllers/expressInquiry.controller';

const router = Router();

router.use(authRequired);
router.post('/submit', expressInquiryController.submit);

export default router;
