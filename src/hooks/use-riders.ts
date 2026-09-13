import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeliveryService } from '@/services/delivery.service';
import { Rider } from '@/types';

export const useRiders = (filters?: { search?: string; status?: string }) => {
  return useQuery({
    queryKey: ['riders', filters],
    queryFn: () => DeliveryService.getRiders(filters),
  });
};

export const useRider = (id: string) => {
  return useQuery({
    queryKey: ['riders', id],
    queryFn: () => DeliveryService.getRider(id),
    enabled: !!id,
  });
};

export const useCreateRider = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (rider: Partial<Rider>) => DeliveryService.createRider(rider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
    },
  });
};

export const useSetRiderPassword = () => {
  return useMutation({
    mutationFn: ({ riderId, password }: { riderId: string; password: string }) =>
      DeliveryService.setRiderPassword(riderId, password),
  });
};

export const useUpdateRider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Rider> }) => DeliveryService.updateRider(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      queryClient.invalidateQueries({ queryKey: ['riders', id] });
    },
  });
};

export const useDeleteRider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => DeliveryService.deleteRider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
    },
  });
};
