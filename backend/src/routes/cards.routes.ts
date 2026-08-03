import { Router } from 'express';
import multer from 'multer';
import { authRequired } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import { cardsController } from '../controllers/cards.controller';

const router = Router();

// ── 普通用户：名片目录 ──
router.get('/directory', authRequired, cardsController.directory);
router.get('/directory/batches', authRequired, cardsController.directoryBatches);
router.get('/directory/tags', authRequired, cardsController.directoryTags);
router.get('/directory/download', authRequired, cardsController.downloadDirectory);
router.get('/directory/download-status', authRequired, cardsController.directoryDownloadStatus);
router.post('/directory/purchase', authRequired, cardsController.purchaseDirectory);

// ── OCR 识别（拍照上传） ──
const ocrUpload = multer({ storage: multer.diskStorage({ destination: './uploads/ocr', filename: (_r, f, cb) => cb(null, Date.now() + '-' + f.originalname) }) });
router.post('/ocr-scan', authRequired, requireAdmin, ocrUpload.single('image'), cardsController.ocrScan);

// ── 管理员：管理名片 ──
router.post('/add', authRequired, requireAdmin, cardsController.addCards);
router.post('/add-and-invite', authRequired, requireAdmin, cardsController.addAndInvite);
router.get('/batches', authRequired, requireAdmin, cardsController.batches);
router.get('/batches/:batchId', authRequired, requireAdmin, cardsController.batchDetail);
router.post('/batches/:batchId/invite', authRequired, requireAdmin, cardsController.inviteBatch);

// ── 管理员：上传通讯录 ──
const excelUpload = multer({ storage: multer.diskStorage({ destination: './uploads/directory_tmp', filename: (_r, f, cb) => cb(null, Date.now() + '-' + f.originalname) }) });
router.post('/directory/upload', authRequired, requireAdmin, excelUpload.single('file'), cardsController.uploadDirectory);
router.get('/directory/preview-invite', authRequired, requireAdmin, cardsController.previewInvite);
router.post('/directory/batch-invite', authRequired, requireAdmin, cardsController.batchInvite);
router.delete('/directory/batch/:batchId', authRequired, requireAdmin, cardsController.deleteBatch);
router.put('/directory/batch/:batchId', authRequired, requireAdmin, cardsController.updateBatch);
router.put('/directory/card/:cardId/tag', authRequired, cardsController.updateCardTag);

export default router;
