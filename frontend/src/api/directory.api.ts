import client from './client';

export interface DirectoryUser {
  id: string;
  display_name: string;
  company_name: string | null;
  phone: string | null;
  card_image: string | null;
  avatar: string | null;
  bio: string | null;
  consult_count: number;
  created_at: string;
}

export interface DirectoryListResponse {
  data: DirectoryUser[];
  total: number;
  page: number;
  limit: number;
}

export const directoryApi = {
  inspectors: (params?: { search?: string; page?: number; limit?: number }) =>
    client.get<DirectoryListResponse>('/directory/inspectors', { params }).then(r => r.data),
  insurers: (params?: { search?: string; page?: number; limit?: number }) =>
    client.get<DirectoryListResponse>('/directory/insurers', { params }).then(r => r.data),
};
