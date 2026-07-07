import client from './client';
import { CargoSpace, DashboardStats } from '../types';

export interface CargoListParams {
  region?: string;
  warehouse_name?: string;
  cargo_type?: string;
  status?: string;
  valid_from?: string;
  valid_to?: string;
  min_cbm?: number;
  max_cbm?: number;
  min_kg?: number;
  max_kg?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export const cargoApi = {
  list: (params: CargoListParams = {}) =>
    client.get<{ data: CargoSpace[]; total: number; page: number; limit: number }>('/cargo-spaces', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    client.get<CargoSpace>(`/cargo-spaces/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<CargoSpace>) =>
    client.put<CargoSpace>(`/cargo-spaces/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    client.delete(`/cargo-spaces/${id}`).then((r) => r.data),

  stats: () =>
    client.get<DashboardStats>('/cargo-spaces/stats').then((r) => r.data),

  myStats: () =>
    client.get<any>('/cargo-spaces/my-stats').then((r) => r.data),

  myAirItems: () =>
    client.get<{ data: any[] }>('/cargo-spaces/my-air-items').then((r) => r.data),
};
