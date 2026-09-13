import { api } from './api';

export class LandmarkService {
  static async list(): Promise<any[]> {
    const { data } = await api.get('/api/admin/landmarks');
    return data;
  }

  static async create(payload: { name: string; aliases?: string[]; lat: number; lng: number; pricingZoneId?: string | null }): Promise<any> {
    const { data } = await api.post('/api/admin/landmarks', payload);
    return data;
  }

  static async update(id: string, payload: Partial<{ name: string; aliases: string[]; lat: number; lng: number; pricingZoneId: string | null; active: boolean }>): Promise<any> {
    const { data } = await api.patch(`/api/admin/landmarks/${id}`, payload);
    return data;
  }

  static async remove(id: string): Promise<any> {
    const { data } = await api.delete(`/api/admin/landmarks/${id}`);
    return data;
  }
}
