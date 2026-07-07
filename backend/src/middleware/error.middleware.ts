import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error(err.message, { stack: err.stack });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  // Multer file size error
  if (err.message === 'File too large') {
    return res.status(413).json({
      error: '文件大小超出限制',
      code: 'FILE_TOO_LARGE',
    });
  }

  // Default server error
  return res.status(500).json({
    error: '服务器内部错误',
    code: 'INTERNAL_ERROR',
  });
}
