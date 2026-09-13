import { api } from './api';
import { Dispute } from '@/types';

export interface DisputesResponse {
  disputes: Dispute[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class DisputeService {
  static async getDisputes(filters?: { status?: string; type?: string; page?: number }): Promise<DisputesResponse> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);
    if (filters?.type && filters.type !== 'ALL') params.set('type', filters.type);
    if (filters?.page) params.set('page', String(filters.page));
    params.set('limit', '50');

    const { data } = await api.get<DisputesResponse>(`/api/admin/disputes?${params.toString()}`);
    return data;
  }

  static async resolveDispute(id: string, resolution: string, forceStatus?: string): Promise<void> {
    await api.post(`/api/admin/disputes/${id}/resolve`, { resolution, forceStatus });
  }
}