import db from '../config/database';
import { UploadedFile, FileStatus, FileType } from '../types';
import { NotFoundError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

/** 构建搜索筛选条件，data 和 count 查询复用 */
function applySearch(query: any, search: string | undefined) {
  if (search && search.trim()) {
    const kw = `%${search.trim()}%`;
    return query.where((qb: any) => {
      qb.where('uploaded_files.original_filename', 'like', kw)
          .orWhere('users.company_name', 'like', kw)
          .orWhere('users.display_name', 'like', kw);
    });
  }
  return query;
}

export const fileService = {
  async create(params: {
    originalFilename: string;
    filePath: string;
    fileType: FileType;
    fileSizeBytes: number;
    uploadedBy: string;
  }): Promise<UploadedFile> {
    const id = uuidv4();
    await db('uploaded_files').insert({
      id,
      original_filename: params.originalFilename,
      file_path: params.filePath,
      file_type: params.fileType,
      file_size_bytes: params.fileSizeBytes,
      status: 'uploaded' as FileStatus,
      uploaded_by: params.uploadedBy,
    });

    const file = await db<UploadedFile>('uploaded_files').where({ id }).first();
    return file!;
  },

  async list(page = 1, limit = 20, search?: string): Promise<{ data: any[]; total: number }> {
    const offset = (page - 1) * limit;
    const baseQuery = () =>
      db('uploaded_files')
        .leftJoin('users', 'uploaded_files.uploaded_by', 'users.id')
        .select(
          'uploaded_files.*',
          'users.display_name as uploader_name',
          'users.company_name as uploader_company'
        );

    const countQuery = () =>
      db('uploaded_files')
        .leftJoin('users', 'uploaded_files.uploaded_by', 'users.id');

    const [data, countResult] = await Promise.all([
      applySearch(baseQuery(), search)
        .orderBy('uploaded_files.created_at', 'desc')
        .limit(limit)
        .offset(offset),
      applySearch(countQuery(), search)
        .count('* as total')
        .first(),
    ]);

    return {
      data,
      total: Number(countResult?.total || 0),
    };
  },

  async getById(id: string): Promise<UploadedFile> {
    const file = await db<UploadedFile>('uploaded_files').where({ id }).first();
    if (!file) {
      throw new NotFoundError('文件不存在');
    }
    return file;
  },

  async delete(id: string): Promise<void> {
    const file = await db<UploadedFile>('uploaded_files').where({ id }).first();
    if (!file) {
      throw new NotFoundError('文件不存在');
    }

    // 删除关联的 cargo_spaces
    await db('cargo_spaces').where({ uploaded_file_id: id }).delete();

    // 删除物理文件
    try {
      if (file.file_path && fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
      }
    } catch (err) {
      // 物理文件已不存在或无权删除——不影响数据库操作
    }

    // 删除数据库记录
    await db('uploaded_files').where({ id }).delete();
  },

  async updateStatus(id: string, status: FileStatus, errorMessage?: string, rowCount?: number): Promise<void> {
    await db('uploaded_files').where({ id }).update({
      status,
      error_message: errorMessage || null,
      row_count: rowCount ?? null,
      updated_at: db.fn.now(),
    });
  },
};
