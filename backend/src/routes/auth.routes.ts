import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authController } from '../controllers/auth.controller';
import { authRequired } from '../middleware/auth.middleware';
import { loginLimiter, forgotLimiter, uploadLimiter, sendCodeLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Multer config for card image uploads
const cardStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, './uploads');
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `card-${uuidv4()}${ext}`);
  },
});
const uploadCard = multer({
  storage: cardStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// Multer config for license uploads
const licenseStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, './uploads');
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `license-${uuidv4()}${ext}`);
  },
});
const uploadLicense = multer({
  storage: licenseStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// Multer config for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, './uploads');
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uuidv4()}${ext}`);
  },
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

router.post('/login', loginLimiter, authController.login);
router.post('/send-code', sendCodeLimiter, authController.sendCode);
router.post('/check-code', authController.checkCode);
router.get('/company-mates', authController.companyMates);
router.get('/profile/:id', authController.companyProfile);
router.get('/me', authRequired, authController.me);
router.get('/lookup', authRequired, authController.lookupByPhone);
router.get('/lookup-by-company', authRequired, authController.lookupByCompany);
router.put('/profile', authRequired, uploadLimiter, uploadCard.single('card_image'), authController.updateProfile);
router.post('/upload-license', authRequired, uploadLicense.single('license'), authController.uploadLicense);
router.post('/upload-avatar', authRequired, uploadLimiter, uploadAvatar.single('avatar'), authController.uploadAvatar);
router.post('/change-password', authRequired, authController.changePassword);
router.post('/forgot-password', forgotLimiter, authController.forgotPassword);
router.post('/reset-password', forgotLimiter, authController.resetPassword);

// ── 账号注销 ──
router.post('/delete-account', authRequired, authController.deleteAccount);

// ── 港口订阅（货代订阅优势港口，有搜索时优先推送） ──
router.get('/subscribed-ports', authRequired, async (req, res) => {
  try {
    const { default: db } = await import('../config/database');
    const user = await db('users').where({ id: req.user!.id }).select('subscribed_ports').first() as any;
    const ports = (user?.subscribed_ports || '').split(',').filter(Boolean);
    res.json({ data: ports });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/subscribe-port', authRequired, async (req, res) => {
  try {
    const { port } = req.body;
    if (!port || !/^[A-Z0-9]{3}$/.test(port)) return res.status(400).json({ error: '请输入有效三字码' });
    const { default: db } = await import('../config/database');
    const user = await db('users').where({ id: req.user!.id }).select('subscribed_ports').first() as any;
    const ports = (user?.subscribed_ports || '').split(',').filter(Boolean);
    if (ports.includes(port)) return res.json({ message: '已订阅', data: ports });
    if (ports.length >= 10) return res.status(400).json({ error: '最多订阅10个港口' });
    ports.push(port);
    await db('users').where({ id: req.user!.id }).update({ subscribed_ports: ports.join(',') });
    res.json({ message: `已订阅 ${port}`, data: ports });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/unsubscribe-port', authRequired, async (req, res) => {
  try {
    const { port } = req.body;
    const { default: db } = await import('../config/database');
    const user = await db('users').where({ id: req.user!.id }).select('subscribed_ports').first() as any;
    const ports = (user?.subscribed_ports || '').split(',').filter(Boolean).filter((p: string) => p !== port);
    await db('users').where({ id: req.user!.id }).update({ subscribed_ports: ports.join(',') });
    res.json({ message: `已取消订阅 ${port}`, data: ports });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
