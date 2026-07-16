import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authController } from '../controllers/auth.controller';
import { authRequired } from '../middleware/auth.middleware';
import { loginLimiter, forgotLimiter, uploadLimiter } from '../middleware/rateLimit.middleware';

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
router.post('/send-code', authController.sendCode);
router.post('/check-code', authController.checkCode);
router.get('/company-mates', authController.companyMates);
router.get('/me', authRequired, authController.me);
router.get('/lookup', authRequired, authController.lookupByPhone);
router.put('/profile', authRequired, uploadLimiter, uploadCard.single('card_image'), authController.updateProfile);
router.post('/upload-license', authRequired, uploadLimiter, uploadLicense.single('license'), authController.uploadLicense);
router.post('/upload-avatar', authRequired, uploadLimiter, uploadAvatar.single('avatar'), authController.uploadAvatar);
router.post('/change-password', authRequired, authController.changePassword);
router.post('/forgot-password', forgotLimiter, authController.forgotPassword);
router.post('/reset-password', forgotLimiter, authController.resetPassword);

// ── 账号注销 ──
router.post('/delete-account', authRequired, authController.deleteAccount);

export default router;
