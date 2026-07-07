import client from './client';

export interface Cooperation {
  id: string;
  agent_user_id: string;
  forwarder_user_id: string;
  agent_company: string | null;
  forwarder_company: string | null;
  service_type: string | null;
  description: string | null;
  status: string;
  confirmed_at: string | null;
  created_at: string;
  partner_name?: string;
  partner_company?: string;
  partner_avatar?: string;
  avg_rating?: number | null;
  review_count?: number;
  total_coops?: number;
}

export interface CreditScore {
  score: number;
  level: string;
  details: {
    reviewCount: number;
    avgRating: number;
    totalCoops: number;
    totalDisputes: number;
    hasCard: boolean;
    daysSinceReg: number;
  };
}

export interface DisputeCase {
  id: string;
  cooperation_id: string | null;
  filed_by: string;
  respondent_id: string;
  title: string;
  description: string;
  evidence: string | null;
  status: string;
  verdict: string | null;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
  filer_name?: string;
  filer_company?: string;
  respondent_name?: string;
  respondent_company?: string;
}

/** 登记合作 */
export function createCooperation(data: { agent_user_id: string; agent_company?: string; service_type?: string; description?: string }) {
  return client.post('/cooperations', data);
}

/** 确认合作（代理方） */
export function confirmCooperation(id: string) {
  return client.post(`/cooperations/${id}/confirm`);
}

/** 我的合作商列表 */
export function fetchMyPartners() {
  return client.get<{ data: Cooperation[] }>('/cooperations/my-partners');
}

/** 信用分 */
export function fetchCreditScore(userId: string) {
  return client.get<CreditScore>(`/cooperations/credit-score/${userId}`);
}

/** 发起争议 */
export function createDispute(data: { cooperation_id?: string; respondent_id: string; title: string; description: string; evidence?: string[] }) {
  return client.post('/disputes', data);
}

/** 争议列表 */
export function fetchDisputes(status?: string) {
  return client.get<{ data: DisputeCase[] }>('/disputes', { params: { status } });
}

/** 管理员解决争议 */
export function resolveDispute(id: string, status: string, verdict?: string) {
  return client.post(`/disputes/${id}/resolve`, { status, verdict });
}
