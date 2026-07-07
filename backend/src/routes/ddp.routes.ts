import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authRequired } from '../middleware/auth.middleware';
import { ddpController } from '../controllers/ddp.controller';
import { env } from '../config/env';

const router = Router();

// DDP文件上传（箱单发票等）- 仅单文件
const ddpUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => { cb(null, env.upload.dir); },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `ddp-${uuidv4()}${ext}`);
    },
  }),
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xlsx', '.xls'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error(`不支持的文件类型，请上传图片/PDF/Word/Excel`));
    }
    cb(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.use(authRequired);

// 代理列表（公开）
router.get('/agents', ddpController.agents);

// 全部代理（管理员）
router.get('/agents/all', ddpController.allAgents);

// 添加/编辑代理（管理员）
router.post('/agents/save', ddpController.saveAgent);

// 审核代理（管理员）
router.post('/agents/:id/review', ddpController.reviewAgent);

// 删除代理（管理员）
router.delete('/agents/:id', ddpController.deleteAgent);

// 海外代理自助入驻
router.post('/agents/self-onboard', ddpController.selfOnboard);
router.get('/agents/my-status', ddpController.myOnboardStatus);

// DDP文件上传
router.post('/upload', ddpUpload.single('file'), ddpController.uploadFile);

// DDP 询价
router.post('/inquiry', ddpController.submitInquiry);
router.get('/my-inquiries', ddpController.myInquiries);

// 需求热度统计
router.get('/stats', ddpController.stats);

export default router;
