import client from './client';

export interface Complaint {
  id: string;
  complaint_company: string;
  target_company: string;
  complaint_person: string;
  target_person: string;
  reason: string;
  created_by?: string;
  uploader_name?: string;
  uploader_company?: string;
  created_at: string;
}

export interface ComplaintListResponse {
  data: Complaint[];
  total: number;
  page: number;
  limit: number;
}

export const complaintsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    client.get<ComplaintListResponse>('/complaints', { params }).then((r) => r.data),

  create: (data: {
    complaint_company: string;
    target_company: string;
    complaint_person: string;
    target_person: string;
    reason: string;
  }) =>
    client.post('/complaints', data).then((r) => r.data),

  delete: (id: string) =>
    client.delete(`/complaints/${id}`).then((r) => r.data),
};
