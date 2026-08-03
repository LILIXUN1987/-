import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { complaintsController } from '../controllers/complaints.controller';

const router = Router();

router.use(authRequired);
router.get('/', complaintsController.list);
router.get('/company-stats', complaintsController.companyStats);
router.post('/', complaintsController.create);
router.post('/:id/appeal', complaintsController.appeal);
router.get('/appeals/list', complaintsController.listAppeals);
router.put('/appeals/:id/review', complaintsController.reviewAppeal);
router.delete('/:id', complaintsController.delete);

export default router;
