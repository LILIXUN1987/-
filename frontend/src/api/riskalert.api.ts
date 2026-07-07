import client from './client';

export interface RiskAlert {
  id: string;
  target_company: string;
  complaint_count: number;
  status: string;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  processed_at: string | null;
}

export const riskAlertApi = {
  pending: () =>
    client.get<{ data: RiskAlert[] }>('/risk-alerts/pending').then(r => r.data),

  history: () =>
    client.get<{ data: RiskAlert[] }>('/risk-alerts/history').then(r => r.data),

  approve: (id: string) =>
    client.post(`/risk-alerts/${id}/approve`).then(r => r.data),

  reject: (id: string) =>
    client.post(`/risk-alerts/${id}/reject`).then(r => r.data),
};
