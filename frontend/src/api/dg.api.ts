import client from './client';

export interface DgAgent {
  id: string;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  service_categories: string | null;
  ports: string | null;
  description: string | null;
  status: string;
  type: string;
  created_by: string | null;
  created_at: string;
}

export interface DgCase {
  id: string;
  agent_name: string | null;
  title: string;
  content: string;
  un_number: string | null;
  awb_number: string | null;
  file_paths: string | null;
  checklist: string | null;
  port: string | null;
  type: string;
  status: string;
  created_by: string | null;
  created_at: string;
}

export interface DgFaq {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  type: string;
  created_by: string | null;
  created_at: string;
  answered_by?: string;
  answerer_name?: string;
  answered_at?: string;
}

export const dgApi = {
  agents: (type = 'air') => client.get<{ data: DgAgent[] }>('/dg/agents', { params: { type } }).then(r => r.data.data),
  agentDirectory: (params?: { type?: string; port?: string }) =>
    client.get<{ data: DgAgent[] }>('/dg/agents/directory', { params }).then(r => r.data.data),
  addAgent: (data: any) => client.post('/dg/agents', data).then(r => r.data),
  allAgents: (type = 'air') => client.get<{ data: DgAgent[] }>('/dg/agents/all', { params: { type } }).then(r => r.data.data),
  reviewAgent: (id: string, action: 'approved' | 'rejected') => client.put('/dg/agents/review', { id, action }).then(r => r.data),

  cases: (type = 'air') => client.get<{ data: DgCase[] }>('/dg/cases', { params: { type } }).then(r => r.data.data),
  addCase: (data: any) => client.post('/dg/cases', data).then(r => r.data),
  uploadCaseFile: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return client.post<{ filePath: string }>('/dg/cases/upload', fd).then(r => r.data);
  },
  allCases: (type = 'air') => client.get<{ data: DgCase[] }>('/dg/cases/all', { params: { type } }).then(r => r.data.data),
  reviewCase: (id: string, action: 'approved' | 'rejected') => client.put('/dg/cases/review', { id, action }).then(r => r.data),

  knowledge: () => client.get<{ data: any[] }>('/dg/knowledge').then(r => r.data.data),
  saveKnowledge: (data: any) => client.post('/dg/knowledge', data).then(r => r.data),
  deleteKnowledge: (id: string) => client.delete(`/dg/knowledge/${id}`).then(r => r.data),

  faqs: (type = 'air') => client.get<{ data: DgFaq[] }>('/dg/faqs', { params: { type } }).then(r => r.data.data),
  addFaq: (data: any) => client.post('/dg/faqs', data).then(r => r.data),
  allFaqs: (type = 'air') => client.get<{ data: DgFaq[] }>('/dg/faqs/all', { params: { type } }).then(r => r.data.data),
  answerFaq: (id: string, answer: string) => client.put('/dg/faqs/answer', { id, answer }).then(r => r.data),
  deleteFaq: (id: string) => client.delete(`/dg/faqs/${id}`).then(r => r.data),

  stats: (type = 'air') => client.get('/dg/stats', { params: { type } }).then(r => r.data),
};
