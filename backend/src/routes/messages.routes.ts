import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { messagesController } from '../controllers/messages.controller';
import { messageUpload } from '../middleware/messageUpload.middleware';
import { messageLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.use(authRequired);

// ── 发送消息（支持文件附件） ──
router.post('/', messageLimiter, messageUpload.array('files', 5), messagesController.send);

// ── 对话列表（新） ──
router.get('/conversations', messagesController.conversations);

// ── 与某人的聊天记录（新） ──
router.get('/conversations/:contactId/messages', messagesController.conversationMessages);

// ── 收件箱 / 已发送 ──
router.get('/inbox', messagesController.inbox);
router.get('/outbox', messagesController.outbox);

// ── 标记已读 ──
router.put('/:id/read', messagesController.markRead);
router.put('/read-all/:userId', messagesController.markAllRead);
router.put('/read-all', messagesController.markAllInboxRead);

// ── 删除对话 ──
router.delete('/conversation/:userId', messagesController.deleteConversation);

// ── 其他 ──
router.get('/poster/:rawMessageId', messagesController.getPosterByRawMessage);
router.get('/my-inquiries', messagesController.myInquiries);
router.get('/received-inquiries', messagesController.receivedInquiries);
router.post('/contact-admin', messagesController.contactAdmin);
router.post('/legal-consult/:lawyerId', messagesController.legalConsult);
router.get('/lawyer-consultations', messagesController.lawyerConsultations);
router.get('/service-consultations', messagesController.serviceConsultations);
router.post('/service-consult/:role', messagesController.serviceConsult);

export default router;
