import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RiderPortalService } from '@/services/rider-portal.service';

// Par défaut, react-query met le polling en pause dès que l'onglet passe en
// arrière-plan (téléphone verrouillé, appli changée), et le provider global
// désactive le "rafraîchir au retour sur l'app" (refetchOnWindowFocus).
// Résultat concret pour le chauffeur : une nouvelle course assignée ou un
// changement de statut n'apparaît qu'après avoir rouvert/rechargé la page à
// la main. On force donc ces 3 options sur les données qui doivent vraiment
// rester à jour en continu, même appli en arrière-plan.
const LIVE_REFETCH_OPTIONS = {
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

export const useMyOrders = () => {
  return useQuery({
    queryKey: ['rider', 'my-orders'],
    queryFn: () => RiderPortalService.getMyOrders(),
    refetchInterval: 15000,
    ...LIVE_REFETCH_OPTIONS,
  });
};

export const useMyOrderHistory = (page = 1) => {
  return useQuery({
    queryKey: ['rider', 'my-orders-history', page],
    queryFn: () => RiderPortalService.getMyOrderHistory(page),
  });
};

export const useMyOrder = (id: string) => {
  return useQuery({
    queryKey: ['rider', 'my-order', id],
    queryFn: () => RiderPortalService.getMyOrder(id),
    enabled: !!id,
    refetchInterval: 10000,
    ...LIVE_REFETCH_OPTIONS,
  });
};

export const useAvailableOrders = () => {
  return useQuery({
    queryKey: ['rider', 'available-orders'],
    queryFn: () => RiderPortalService.getAvailableOrders(),
    refetchInterval: 20000,
    ...LIVE_REFETCH_OPTIONS,
  });
};

export const useClaimOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => RiderPortalService.claimOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider', 'available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['rider', 'my-orders'] });
    },
  });
};

export const useCreateManualOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { description: string; amount: number; note?: string; lat: number; lng: number }) =>
      RiderPortalService.createManualOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider', 'stats'] });
    },
  });
};

export const useRiderStats = () => {
  return useQuery({
    queryKey: ['rider', 'stats'],
    queryFn: () => RiderPortalService.getStats(),
  });
};