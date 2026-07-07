import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import db from '../config/database';
import { fileService } from '../services/file.service';
import { FileType } from '../types';
import { env } from '../config/env';

function getFileType(filename: string): FileType {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') return 'excel';
  if (ext === '.csv') return 'csv';
  if (ext === '.pdf') return 'pdf';
  return 'excel';
}

/** Multer 在 Windows 下中文文件名乱码，latin1→utf8 修正 */
function fixName(name: string): string {
  return Buffer.from(name, 'latin1').toString('utf8');
}

export const filesController = {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '请选择文件上传', code: 'NO_FILE' });
      }

      // ── 同一业务员当天上传同一文件 → 不重复存储 ──
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const originalName = fixName(req.file.originalname);
      const duplicate = await db('uploaded_files')
        .where({ uploaded_by: req.user!.id, original_filename: originalName, file_size_bytes: req.file.size })
        .where('created_at', '>=', todayStart.toISOString())
        .first();
      if (duplicate) {
        try { if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch { /* ok */ }
        return res.json({ ...duplicate, message: '检测到重复上传，已自动合并' });
      }

      const file = await fileService.create({
        originalFilename: originalName,
        filePath: req.file.path,
        fileType: getFileType(originalName),
        fileSizeBytes: req.file.size,
        uploadedBy: req.user!.id,
      });

      res.status(201).json({ ...file, message: '文件上传成功' });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string || undefined;
      const result = await fileService.list(page, limit, search);
      res.json({ ...result, page, limit });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const file = await fileService.getById(req.params.id);
      res.json(file);
    } catch (err) {
      next(err);
    }
  },

  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const file = await fileService.getById(req.params.id);
      const filePath = path.resolve(file.file_path);
      // 防止路径穿越
      if (!filePath.startsWith(path.resolve(env.upload.dir))) {
        return res.status(403).json({ error: '非法文件路径' });
      }
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '文件不存在或已被删除' });
      }

      // ── 记录下载 ──
      if (req.user?.id) {
        const downloader = await db('users').where({ id: req.user.id }).first() as any;
        try {
          const { v4: uuidv4 } = await import('uuid');
          // 避免重复记录（同一用户短时间内多次下载同一文件只记一次）
          const recent = await db('file_downloads')
            .where({ file_id: req.params.id, user_id: req.user.id })
            .orderBy('created_at', 'desc')
            .first();
          if (!recent) {
            await db('file_downloads').insert({
              id: uuidv4(),
              file_id: req.params.id,
              user_id: req.user.id,
              file_name: file.original_filename,
              downloader_company: downloader?.company_name || null,
              downloader_name: downloader?.display_name || null,
            });
            await db('uploaded_files').where({ id: req.params.id }).increment('download_count', 1);
          }
        } catch (logErr) { /* 记录下载失败不影响下载 */ }
      }

      // 清理原始文件名中的路径穿越字符
      const safeName = fixName(file.original_filename).replace(/[/\\:?<>|*"]/g, '_');
      res.download(filePath, safeName);
    } catch (err) {
      next(err);
    }
  },

  // ── 获取文件的下载者列表 ──
  async downloaders(req: Request, res: Response, next: NextFunction) {
    try {
      const file = await fileService.getById(req.params.id);
      // 仅文件上传者和管理员可查看
      const user = await db('users').where({ id: req.user!.id }).first() as any;
      if (!user || (user.role !== 'admin' && file.uploaded_by !== req.user!.id)) {
        return res.status(403).json({ error: '无权限查看' });
      }

      const data = await db('file_downloads')
        .where({ file_id: req.params.id })
        .orderBy('created_at', 'desc')
        .limit(50);

      res.json({ data, total: data.length });
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const file = await fileService.getById(req.params.id);
      // 只允许文件上传者或管理员删除
      const user = await db('users').where({ id: req.user!.id }).first() as any;
      if (!user || (user.role !== 'admin' && file.uploaded_by !== req.user!.id)) {
        return res.status(403).json({ error: '无权限删除此文件' });
      }
      await fileService.delete(req.params.id);
      res.json({ message: '文件已删除' });
    } catch (err) {
      next(err);
    }
  },
};
