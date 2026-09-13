'use client';

import { useQuery } from '@tanstack/react-query';
import { PaymentService } from '@/services/payment.service';

export function usePaymentStatus(paymentId: string | null) {
  return useQuery({
    queryKey: ['payment-status', paymentId],
    queryFn: () => PaymentService.getStatus(paymentId!),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' ? 3000 : false;
    },
    enabled: !!paymentId,
  });
}
