import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeliveryService } from '@/services/delivery.service';

export const useOrders = (filters?: { search?: string; status?: string; partnerId?: string }) => {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => DeliveryService.getOrders(filters),
  });
};

// Statuts après lesquels la course est terminée : plus besoin de suivre
// la position du chauffeur en direct, on arrête le polling.
const TERMINAL_STATUSES = ['DELIVERED', 'CANCELLED', 'FAILED'];

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => DeliveryService.getOrder(id),
    enabled: !!id,
    // Suivi en temps réel du mouvement du chauffeur côté admin (même logique
    // que useTracking côté client) : sans ça, la position affichée sur la
    // carte ne se rafraîchit jamais tant que la page n'est pas rechargée.
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status;
      return status && !TERMINAL_STATUSES.includes(status) ? 10_000 : false;
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => DeliveryService.updateOrder(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      DeliveryService.updateOrderStatus(id, status, note),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => DeliveryService.createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useAssignRider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, riderId }: { orderId: string; riderId: string }) =>
      DeliveryService.assignRider(orderId, riderId),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['riders'] });
    },
  });
};

export const useNearestRiders = (lat?: number, lng?: number, enabled: boolean = false) => {
  return useQuery({
    queryKey: ['nearest-riders', lat, lng],
    queryFn: () => DeliveryService.getNearestRiders(lat as number, lng as number),
    enabled: enabled && lat != null && lng != null,
  });
};

export const useSetOrderAmount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, amount }: { orderId: string; amount: number }) =>
      DeliveryService.setOrderAmount(orderId, amount),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
  });
};

export const useOrderClaims = (orderId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['order-claims', orderId],
    queryFn: () => DeliveryService.getOrderClaims(orderId),
    enabled: enabled && !!orderId,
  });
};

export const useApproveClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, claimId }: { orderId: string; claimId: string }) =>
      DeliveryService.approveClaim(orderId, claimId),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-claims', orderId] });
      queryClient.invalidateQueries({ queryKey: ['riders'] });
    },
  });
};

export const useRejectClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, claimId }: { orderId: string; claimId: string }) =>
      DeliveryService.rejectClaim(orderId, claimId),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['order-claims', orderId] });
    },
  });
};

// Filet de secours admin : le client a confirmé avoir payé, mais le
// chauffeur n'a pas pu confirmer réception lui-même (téléphone hors
// service, perdu...). L'API refuse déjà si le client n'a pas confirmé
// en premier — voir /api/admin/orders/[id]/cash-received.
export const useConfirmCashReceivedByAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => DeliveryService.confirmCashReceivedByAdmin(orderId),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
  });
};