import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DisputeService, DisputesResponse } from '@/services/dispute.service';

export const useDisputes = (filters?: { status?: string; type?: string }) => {
  return useQuery<DisputesResponse>({
    queryKey: ['disputes', filters],
    queryFn: () => DisputeService.getDisputes(filters),
  });
};

export const useResolveDispute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolution, forceStatus }: { id: string; resolution: string; forceStatus?: string }) =>
      DisputeService.resolveDispute(id, resolution, forceStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
  });
};