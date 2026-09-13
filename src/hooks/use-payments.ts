import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DeliveryService } from '@/services/delivery.service';

export const usePayments = () => {
  return useQuery({
    queryKey: ['payments'],
    queryFn: () => DeliveryService.getPayments(),
  });
};

export const useRecordCashPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => DeliveryService.recordCashPayment(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
};