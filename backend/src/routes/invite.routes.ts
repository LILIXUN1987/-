import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { inviteController } from '../controllers/invite.controller';

const router = Router();

router.use(authRequired);

router.post('/', inviteController.invite);
router.get('/my-invitations', inviteController.myInvitations);

export default router;
