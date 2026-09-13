import { api } from './api';
import { Delivery } from '@/types';

export interface PublicOrderCreationResponse {
  trackingNumber: string;
  orderId: string;
  senderToken: string;
  recipientToken: string | null;
  deliveryType: 'SELF' | 'THIRD_PARTY';
}

export class PublicOrderService {
  static async createPublicOrder(orderData: any): Promise<PublicOrderCreationResponse> {
    const { data } = await api.post<PublicOrderCreationResponse>('/api/public/orders', orderData);
    return data;
  }

  static async getPublicOrder(trackingNumber: string): Promise<Delivery> {
    const { data } = await api.get<Delivery>(`/api/public/orders/${trackingNumber}`);
    return data;
  }

  static async getByToken(token: string): Promise<{ order: Delivery; role: 'SENDER' | 'RECIPIENT' }> {
    const { data } = await api.get<{ order: Delivery; role: 'SENDER' | 'RECIPIENT' }>(`/api/public/tracking/${token}`);
    return data;
  }
}