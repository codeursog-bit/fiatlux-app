import { useQuery } from '@tanstack/react-query';
import { DeliveryService } from '@/services/delivery.service';

export const useDeliveries = () => {
  return useQuery({
    queryKey: ['deliveries'],
    queryFn: () => DeliveryService.getDeliveries(),
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => DeliveryService.getDashboardStats(),
  });
};

export const useActivities = () => {
  return useQuery({
    queryKey: ['activities'],
    queryFn: () => DeliveryService.getActivities(),
  });
};

export const useAlerts = () => {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => DeliveryService.getAlerts(),
  });
};

// La page "Suivi en direct" (carte admin) affiche un badge "EN LIGNE"
// clignotant qui donne l'impression d'un vrai temps réel, mais sans polling
// ici les positions des livreurs ne se rafraîchissaient qu'à l'ouverture de
// la page — il fallait recharger à la main pour voir un livreur avancer.
export const useRiders = () => {
  return useQuery({
    queryKey: ['riders'],
    queryFn: () => DeliveryService.getRiders(),
    refetchInterval: 8000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};