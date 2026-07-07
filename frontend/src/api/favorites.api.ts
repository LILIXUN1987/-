import client from './client';

// ── 类型定义 ──

export interface FavoriteItem {
  id: string;
  region: string | null;
  warehouse_name: string | null;
  origin_port: string | null;
  dest_port: string | null;
  airline_code: string | null;
  available_cbm: number | null;
  available_kg: number | null;
  price_per_cbm: number | null;
  price_per_kg: number | null;
  currency: string | null;
  cargo_type: string | null;
  status: string | null;
  notes: string | null;
  valid_from: string | null;
  valid_to: string | null;
  contact_info: string | null;
  cargo_created_at: string;
  favorited_at: string;
}

export interface FavoriteListResponse {
  data: FavoriteItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ToggleResponse {
  favorited: boolean;
  message: string;
}

export interface BatchStatusResponse {
  data: Record<string, boolean>;
}

// ── API 方法 ──

export const favoritesApi = {
  toggle: (cargoId: string) =>
    client.post<ToggleResponse>('/favorites/toggle', { cargo_id: cargoId }).then(r => r.data),

  list: (params?: { page?: number; limit?: number }) =>
    client.get<FavoriteListResponse>('/favorites/list', { params }).then(r => r.data),

  status: (cargoId: string) =>
    client.get<{ favorited: boolean }>(`/favorites/status?cargo_id=${cargoId}`).then(r => r.data),

  batchStatus: (ids: string[]) =>
    client.get<BatchStatusResponse>(`/favorites/batch-status?ids=${ids.join(',')}`).then(r => r.data),
};
