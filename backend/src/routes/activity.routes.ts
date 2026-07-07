import { Router } from 'express';
import { activityController } from '../controllers/activity.controller';

const router = Router();

// 生成社区入口二维码
router.get('/qrcode', activityController.qrcode);

// 实时动态消息流
router.get('/activity-feed', activityController.feed);

export default router;
