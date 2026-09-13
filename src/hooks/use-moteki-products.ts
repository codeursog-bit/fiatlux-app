import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotekiProductService } from '@/services/moteki-product.service';

export const useMotekiProducts = () => {
  return useQuery({
    queryKey: ['admin', 'moteki-products'],
    queryFn: () => MotekiProductService.list(),
  });
};

export const useCreateMotekiProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: MotekiProductService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'moteki-products'] }),
  });
};

export const useUpdateMotekiProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => MotekiProductService.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'moteki-products'] }),
  });
};

export const useDeleteMotekiProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => MotekiProductService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'moteki-products'] }),
  });
};
