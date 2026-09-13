import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeliveryService } from '@/services/delivery.service';
import { Vehicle } from '@/types';

export const useFleet = () => {
  return useQuery({
    queryKey: ['fleet'],
    queryFn: () => DeliveryService.getFleet(),
  });
};

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Vehicle> }) => DeliveryService.updateVehicle(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
    },
  });
};

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => DeliveryService.deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
    },
  });
};
