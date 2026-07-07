import client from './client';

export interface Suggestion {
  id: string;
  suggester_name: string;
  suggester_company: string;
  content: string;
  status: string;
  created_by: string;
  created_at: string;
}

export interface SuggestionListResponse {
  data: Suggestion[];
  total: number;
  page: number;
  limit: number;
}

export const suggestionsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    client.get<SuggestionListResponse>('/suggestions', { params }).then((r) => r.data),

  create: (content: string) =>
    client.post<{ message: string }>('/suggestions', { content }).then((r) => r.data),

  delete: (id: string) =>
    client.delete(`/suggestions/${id}`).then((r) => r.data),
};
