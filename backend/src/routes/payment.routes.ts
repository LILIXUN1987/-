import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { paymentController } from '../controllers/payment.controller';

const router = Router();

// ── 不需要登录的端点（支付宝异步通知） ──
router.post('/notify', paymentController.notify);

// ── 需要登录的端点 ──
router.get('/plans', paymentController.plans);
router.post('/create-order', authRequired, paymentController.createOrder);
router.get('/query/:orderId', authRequired, paymentController.queryOrder);
router.get('/my-orders', authRequired, paymentController.myOrders);

export default router;
