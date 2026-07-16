import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { referralController } from '../controllers/referral.controller';
import { registerLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// QR code and click tracking are public (loaded via <img> tag or shared links)
router.get('/qr', referralController.qrCode);
router.get('/click', referralController.click);

router.use(authRequired);
router.get('/stats', referralController.stats);
router.get('/history', referralController.history);
router.get('/leaderboard', referralController.leaderboard);
router.get('/benefits', referralController.benefits);
router.post('/recommend', registerLimiter, referralController.recommend);
router.get('/recommendations', referralController.recommendations);

export default router;
