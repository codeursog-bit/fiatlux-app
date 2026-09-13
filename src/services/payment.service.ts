import { api } from './api';

export interface PaymentInitiationResponse {
  paymentId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  redirectUrl: string | null;
}

export interface PaymentStatusResponse {
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  trackingNumber?: string;
}

export class PaymentService {
  static async initiate(orderId: string, operator: 'MTN' | 'AIRTEL', phone: string): Promise<PaymentInitiationResponse> {
    const { data } = await api.post<PaymentInitiationResponse>('/api/public/payments/initiate', {
      orderId,
      operator,
      phone,
    });
    return data;
  }

  static async getStatus(paymentId: string): Promise<PaymentStatusResponse> {
    const { data } = await api.get<PaymentStatusResponse>(`/api/public/payments/status?paymentId=${paymentId}`);
    return data;
  }

  static async switchToCash(orderId: string, cashPaymentSubtype: 'SENDER_PAYS' | 'RECIPIENT_PAYS' = 'SENDER_PAYS'): Promise<void> {
    await api.patch(`/api/public/orders/by-id/${orderId}/payment-method`, { cashPaymentSubtype });
  }

  static async getOrderInfo(orderId: string): Promise<{ trackingNumber: string; amount: number; packageDescription: string; senderToken: string; recipientToken: string | null; deliveryType: 'SELF' | 'THIRD_PARTY' }> {
    const { data } = await api.get(`/api/public/orders/by-id/${orderId}`);
    return data;
  }
}