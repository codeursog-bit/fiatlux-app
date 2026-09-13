import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeliveryService } from '@/services/delivery.service';
import { Customer } from '@/types';

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => DeliveryService.getCustomers(),
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (customer: Partial<Customer>) => DeliveryService.createCustomer(customer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Customer> }) => DeliveryService.updateCustomer(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => DeliveryService.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};
