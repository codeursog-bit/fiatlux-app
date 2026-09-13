import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeliveryService } from '@/services/delivery.service';

export const usePricingZones = () => {
  return useQuery({
    queryKey: ['pricing-zones'],
    queryFn: () => DeliveryService.getPricingZones(),
  });
};

export const useCreatePricingZone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (zoneName: string) => DeliveryService.createPricingZone(zoneName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-zones'] });
    },
  });
};

export const useUpdatePricingZone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, zoneName }: { id: string; zoneName: string }) => DeliveryService.updatePricingZone(id, zoneName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-zones'] });
    },
  });
};

export const useDeletePricingZone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => DeliveryService.deletePricingZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-zones'] });
    },
  });
};

export const useSaveZoneBoundary = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ zoneId, points }: { zoneId: string; points: { lat: number; lng: number }[] }) =>
      DeliveryService.saveZoneBoundary(zoneId, points),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pricing-zones'] }),
  });
};

export const useDeleteZoneBoundary = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (zoneId: string) => DeliveryService.deleteZoneBoundary(zoneId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pricing-zones'] }),
  });
};

export const usePricingRules = () => {
  return useQuery({
    queryKey: ['pricing-rules'],
    queryFn: () => DeliveryService.getPricingRules(),
  });
};

export const useCreatePricingRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rule: any) => DeliveryService.createPricingRule(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
    },
  });
};

export const useUpdatePricingRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rule }: { id: string; rule: any }) => DeliveryService.updatePricingRule(id, rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
    },
  });
};

export const useDeletePricingRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => DeliveryService.deletePricingRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
    },
  });
};
