import client from './client';

export interface Lawyer {
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

export interface LawyerListResponse {
  data: Lawyer[];
  total: number;
  page: number;
  limit: number;
}

export const lawyersApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    client.get<LawyerListResponse>('/lawyers', { params }).then((res) => res.data),
};
