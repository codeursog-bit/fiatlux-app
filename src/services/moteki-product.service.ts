import { api } from './api';

export class MotekiProductService {
  static async list(): Promise<any[]> {
    const { data } = await api.get('/api/admin/moteki-products');
    return data;
  }

  static async create(payload: { amount: number; productUuid: string; label?: string }): Promise<any> {
    const { data } = await api.post('/api/admin/moteki-products', payload);
    return data;
  }

  static async update(id: string, payload: { productUuid?: string; label?: string }): Promise<any> {
    const { data } = await api.patch(`/api/admin/moteki-products/${id}`, payload);
    return data;
  }

  static async remove(id: string): Promise<any> {
    const { data } = await api.delete(`/api/admin/moteki-products/${id}`);
    return data;
  }
}
