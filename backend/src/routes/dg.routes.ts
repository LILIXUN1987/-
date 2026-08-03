import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authRequired } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import { dgController } from '../controllers/dg.controller';

const caseStorage = multer.diskStorage({
  destination: (_req, _file, cb) => { cb(null, './uploads'); },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `dg-case-${uuidv4()}${ext}`);
  },
});
const uploadCaseFile = multer({
  storage: caseStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const router = Router();

router.use(authRequired);

// 危险品代理
router.get('/agents', dgController.agents);
router.get('/agents/directory', dgController.directory);
router.post('/agents', dgController.addAgent);
router.get('/agents/all', requireAdmin, dgController.allAgents);
router.put('/agents/review', requireAdmin, dgController.reviewAgent);

// 走货实例
router.get('/cases', dgController.cases);
router.post('/cases', dgController.addCase);
router.post('/cases/upload', uploadCaseFile.single('file'), dgController.uploadCaseFile);
router.get('/cases/all', requireAdmin, dgController.allCases);
router.put('/cases/review', requireAdmin, dgController.reviewCase);

// 危险品知识
router.get('/knowledge', dgController.knowledge);
router.post('/knowledge', dgController.saveKnowledge);
router.delete('/knowledge/:id', requireAdmin, dgController.deleteKnowledge);

// FAQ
router.get('/faqs', dgController.faqs);
router.post('/faqs', dgController.addFaq);
router.get('/faqs/all', requireAdmin, dgController.allFaqs);
router.put('/faqs/answer', dgController.answerFaq);
router.get('/stats', dgController.stats);
router.delete('/faqs/:id', requireAdmin, dgController.deleteFaq);

export default router;
