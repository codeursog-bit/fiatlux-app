import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LandmarkService } from '@/services/landmark.service';

export const useLandmarks = () => {
  return useQuery({
    queryKey: ['admin', 'landmarks'],
    queryFn: () => LandmarkService.list(),
  });
};

export const useCreateLandmark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: LandmarkService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'landmarks'] }),
  });
};

export const useUpdateLandmark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => LandmarkService.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'landmarks'] }),
  });
};

export const useDeleteLandmark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => LandmarkService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'landmarks'] }),
  });
};
