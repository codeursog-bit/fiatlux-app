import { OrderStatus } from '@prisma/client';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
  [OrderStatus.ASSIGNED]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.EN_ROUTE_TO_PICKUP, OrderStatus.CANCELLED],
  [OrderStatus.EN_ROUTE_TO_PICKUP]: [OrderStatus.AT_PICKUP, OrderStatus.CANCELLED],
  [OrderStatus.AT_PICKUP]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
  // AT_DROPOFF directement autorisé depuis PICKED_UP : aucune action
  // chauffeur ne fait jamais transiter par IN_TRANSIT (pas de bouton dédié
  // dans l'app), donc l'exiger comme étape obligatoire bloquait toutes les
  // livraisons juste après la collecte. IN_TRANSIT reste une étape valide
  // au cas où elle serait utilisée plus tard (ex. mise à jour manuelle admin).
  [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT, OrderStatus.AT_DROPOFF, OrderStatus.FAILED],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.AT_DROPOFF, OrderStatus.FAILED],
  [OrderStatus.AT_DROPOFF]: [OrderStatus.DELIVERED, OrderStatus.FAILED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.FAILED]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  // Same status is always allowed (idempotency)
  if (from === to) return true;
  
  const allowed = VALID_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export function validateTransition(from: OrderStatus, to: OrderStatus) {
  if (!canTransition(from, to)) {
    const error = new Error(`Transition de statut invalide de ${from} vers ${to}`);
    (error as any).status = 409;
    throw error;
  }
}

/**
 * Checks if an order can still be cancelled.
 * Typically allowed before the rider has picked up the package.
 */
export function isCancellable(status: OrderStatus): boolean {
  const nonCancellable: OrderStatus[] = [
    OrderStatus.PICKED_UP,
    OrderStatus.IN_TRANSIT,
    OrderStatus.AT_DROPOFF,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.FAILED
  ];
  return !nonCancellable.includes(status);
}