import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.upload.dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const allowedExtensions = ['.xlsx', '.xls', '.csv', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();

  // 双重校验：扩展名 + MIME类型
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', 'application/csv', // .csv
    'application/pdf', // .pdf
  ];

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`不支持的文件类型: ${ext}。支持的类型: ${allowedExtensions.join(', ')}`));
  }
  if (file.mimetype && !allowedMimes.includes(file.mimetype)) {
    return cb(new Error(`文件内容与扩展名不匹配: ${file.mimetype}`));
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.upload.maxSizeMb * 1024 * 1024,
  },
});
