import client from './client';

export interface DDPAgent {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  country: string;
  city: string | null;
  service_ports: string | null;
  service_types: string | null;
  description: string | null;
  reference_price: string | null;
  completed_orders: number;
  status: string;
  created_by: string;
  created_at: string;
  submitter_name?: string;
  coop_forwarder_count?: number;
  tags?: string;
}

export interface DDPInquiryItem {
  id: string;
  country: string;
  port: string | null;
  goods_desc: string | null;
  notes: string | null;
  created_at: string;
  reply_count: number;
}

export interface DDPInquiryStats {
  country: string;
  count: number;
}

export interface DDPStatsResponse {
  inquiryStats: DDPInquiryStats[];
  agentStats: DDPInquiryStats[];
  overview: {
    totalInquiries: number;
    totalAgents: number;
    pendingAgents: number;
  };
  replyRate?: number;
  weeklyNewInquiries?: number;
  weeklyNewAgents?: number;
  agentGrowth?: { thisMonth: number; lastMonth: number };
  recentActivity?: Array<{ id: string; country: string; port?: string; goods_desc?: string; company_name: string; created_at: string }>;
}

/** 获取已审核代理列表 */
export function fetchAgents(params?: { country?: string; port?: string }) {
  return client.get<{ data: DDPAgent[] }>('/ddp/agents', { params });
}

/** 管理员获取全部代理 */
export function fetchAllAgents() {
  return client.get<{ data: DDPAgent[] }>('/ddp/agents/all');
}

/** 管理员添加/编辑代理 */
export function saveAgent(data: Partial<DDPAgent>) {
  return client.post('/ddp/agents/save', data);
}

/** 管理员审核代理 */
export function reviewAgent(id: string, action: 'approved' | 'rejected') {
  return client.post(`/ddp/agents/${id}/review`, { action });
}

/** 管理员删除代理 */
export function deleteAgent(id: string) {
  return client.delete(`/ddp/agents/${id}`);
}

/** 提交DDP询价 */
export function submitInquiry(data: {
  country: string;
  port?: string;
  goods_desc?: string;
  hs_code?: string;
  notes?: string;
  file_paths?: string[];
  weight_kg?: number;
  volume_cbm?: number;
  address: string;
}) {
  return client.post('/ddp/inquiry', data);
}

/** 上传DDP文件（箱单发票等） */
export function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return client.post<{ filePath: string }>('/ddp/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/** 获取需求热度统计（支持时间范围） */
export function fetchStats(range?: number) {
  return client.get<DDPStatsResponse>('/ddp/stats', { params: { range } });
}

/** 获取我的DDP询价汇总 */
export function fetchMyInquiries() {
  return client.get<{ data: DDPInquiryItem[] }>('/ddp/my-inquiries');
}
