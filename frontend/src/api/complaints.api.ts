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

  companyStats: (q?: string) =>
    client.get<any>('/complaints/company-stats', { params: { q } }).then((r) => r.data),

  // ── 申诉 ──
  appeal: (complaintId: string, data: { contact_info: string; appeal_reason: string; evidence?: string }) =>
    client.post(`/complaints/${complaintId}/appeal`, data).then((r) => r.data),

  listAppeals: (status?: string) =>
    client.get<{ data: any[] }>('/complaints/appeals/list', { params: status ? { status } : {} }).then((r) => r.data),

  reviewAppeal: (id: string, action: 'approved' | 'rejected', review_note?: string) =>
    client.put(`/complaints/appeals/${id}/review`, { action, review_note }).then((r) => r.data),
};
