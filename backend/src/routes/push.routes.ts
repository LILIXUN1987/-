import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import db from '../config/database';
import { saveSubscription, VAPID_PUBLIC_KEY } from '../services/push.service';

const router = Router();
router.use(authRequired);

// 获取 VAPID 公钥
router.get('/vapid-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// 保存推送订阅
router.post('/subscribe', async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: '参数不完整' });
    await saveSubscription(req.user!.id, subscription);
    res.json({ message: '订阅成功' });
  } catch (err) { next(err); }
});

// 取消推送订阅
router.delete('/unsubscribe', async (req, res, next) => {
  try {
    await db('push_subscriptions').where({ user_id: req.user!.id }).delete();
    res.json({ message: '已取消订阅' });
  } catch (err) { next(err); }
});

export default router;
