import { Router } from 'express';
import { authRequired, authOptional } from '../middleware/auth.middleware';
import { aiAskController } from '../controllers/aiAsk.controller';

const router = Router();

// 公开接口（无需登录，但限制频率）
router.post('/ask', authOptional, aiAskController.ask);

export default router;
