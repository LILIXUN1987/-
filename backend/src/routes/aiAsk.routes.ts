import { Router } from 'express';
import { authRequired, authOptional } from '../middleware/auth.middleware';
import { aiAskLimiter } from '../middleware/rateLimit.middleware';
import { aiAskController } from '../controllers/aiAsk.controller';

const router = Router();

// AI问答接口（已登录用户更宽松，未登录用户限流更严）
router.post('/ask', authOptional, aiAskLimiter, aiAskController.ask);

export default router;
