import { Router } from 'express';
import { authRequired, authOptional } from '../middleware/auth.middleware';
import { requireActiveTrial } from '../middleware/trialCheck.middleware';
import { cargoController } from '../controllers/cargo.controller';
import { searchLimiter, parseLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// 查询类路由 — 不拦截过期货代
router.get('/', authOptional, cargoController.list);
router.get('/search-by-category', authOptional, cargoController.searchByCategory);
router.get('/stats', authOptional, cargoController.stats);
router.get('/my-stats', authRequired, cargoController.myStats);
router.get('/trending', cargoController.trending);
router.get('/my-air-items', authOptional, cargoController.myAirItems);

// 数据录入类路由 — 拦截过期货代
router.post('/parse-text', parseLimiter, authRequired, requireActiveTrial, cargoController.parseText);

// 单条记录操作
router.get('/:id', authOptional, cargoController.getById);
router.put('/:id', authRequired, requireActiveTrial, cargoController.update);
router.delete('/:id', authRequired, requireActiveTrial, cargoController.delete);

// ── 导出报价单 ──
router.get('/:id/export-quote', authRequired, cargoController.exportQuote);

export default router;
