import client from './client';
import { UploadedFile } from '../types';

export const filesApi = {
  list: (page = 1, limit = 20, search?: string) =>
    client.get<{ data: UploadedFile[]; total: number }>('/files', { params: { page, limit, search } }).then((r) => r.data),

  getById: (id: string) =>
    client.get<UploadedFile>(`/files/${id}`).then((r) => r.data),

  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<UploadedFile>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  download: async (id: string, filename: string) => {
    const resp = await client.get(`/files/${id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([resp.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  delete: (id: string) =>
    client.delete(`/files/${id}`).then((r) => r.data),

};
