import client from './client';

export interface RawMessage {
  id: string;
  content: string;
  keywords: string | null;
  category: string | null;
  uploaded_by: string;
  created_at: string;
  uploader_name: string | null;
  uploader_company: string | null;
  cargo_count: number; // 关联的货舱记录数
}

export interface RawMessagesResponse {
  data: RawMessage[];
  total: number;
  page: number;
  limit: number;
}

export interface LinkedCargo {
  id: string;
  region: string;
  warehouse_name: string;
  airline_code: string | null;
  available_cbm: number | null;
  available_kg: number | null;
  price_per_cbm: number | null;
  price_per_kg: number | null;
  currency: string;
  valid_from: string;
  valid_to: string;
  cargo_type: string | null;
  status: string;
  contact_info: string | null;
  notes: string | null;
  created_at: string;
}

export interface LinkedCargoResponse {
  data: LinkedCargo[];
  total: number;
}

/** 获取原始记录原文内容 */
export const fetchRawContent = async (id: string): Promise<string> => {
  const res = await client.get<{ data: { content: string } }>(`/raw-messages/${id}/content`);
  return res.data.data.content;
};

export const rawMessagesApi = {
  /** 导出原始记录为 Excel */
  export: async (params: {
    category?: string;
    date_from?: string;
    date_to?: string;
    keyword?: string;
  }) => {
    const resp = await client.post('/raw-messages/export', params, { responseType: 'blob' });
    const disposition = resp.headers['content-disposition'] || '';
    const nameMatch = disposition.match(/filename=(.+)/);
    const filename = nameMatch ? nameMatch[1] : `raw-records-${new Date().toISOString().split('T')[0]}.xlsx`;
    const url = window.URL.createObjectURL(new Blob([resp.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = decodeURIComponent(filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
  list: (params: {
    category?: string;
    date_from?: string;
    date_to?: string;
    keyword?: string;
    page?: number;
    limit?: number;
  }) =>
    client.get<RawMessagesResponse>('/raw-messages', { params }).then((res) => res.data),

  getLinkedCargo: (id: string) =>
    client.get<LinkedCargoResponse>(`/raw-messages/${id}/cargo`).then((res) => res.data),

  /** 批量删除原始记录 */
  deleteBatch: (ids: string[]) =>
    client.delete<{ message: string; deleted: number }>('/raw-messages', { data: { ids } }),
};
