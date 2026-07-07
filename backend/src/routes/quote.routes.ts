import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { quoteController } from '../controllers/quote.controller';

const router = Router();

router.use(authRequired);

// 用户：询价管理
router.post('/create-request', quoteController.createRequest);
router.get('/my-requests', quoteController.myRequests);
router.get('/requests/:requestId/quotes', quoteController.getQuotes);
router.post('/quotes/:quoteId/accept', quoteController.acceptQuote);

// 货代：报价管理
router.get('/pending-requests', quoteController.pendingRequests);
router.post('/submit-quote', quoteController.submitQuote);

export default router;
