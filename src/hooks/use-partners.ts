import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeliveryService } from '@/services/delivery.service';
import { Partner } from '@/types';

export const usePartners = () => {
  return useQuery({
    queryKey: ['partners'],
    queryFn: () => DeliveryService.getPartners(),
  });
};

export const usePartner = (id: string) => {
  return useQuery({
    queryKey: ['partners', id],
    queryFn: () => DeliveryService.getPartner(id),
    enabled: !!id,
  });
};

export const useCreatePartner = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (partner: Partial<Partner>) => DeliveryService.createPartner(partner),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
};

export const useUpdatePartnerStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'ACTIVE' | 'SUSPENDED' }) => 
      DeliveryService.updatePartnerStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
};

export const useUpdatePartner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Partner> }) => DeliveryService.updatePartner(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
};

export const useDeletePartner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => DeliveryService.deletePartner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
};