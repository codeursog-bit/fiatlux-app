import { OrderStatus } from '@/types';

export const APP_CONFIG = {
  NAME: 'Fiat Lux',
  VERSION: '1.0.0',
  API_URL: process.env.NEXT_PUBLIC_API_URL,
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [OrderStatus.ASSIGNED]: 'bg-blue-100 text-blue-800',
  [OrderStatus.ACCEPTED]: 'bg-cyan-100 text-cyan-800',
  [OrderStatus.EN_ROUTE_TO_PICKUP]: 'bg-amber-100 text-amber-800',
  [OrderStatus.AT_PICKUP]: 'bg-orange-100 text-orange-800',
  [OrderStatus.PICKED_UP]: 'bg-indigo-100 text-indigo-800',
  [OrderStatus.IN_TRANSIT]: 'bg-purple-100 text-purple-800',
  [OrderStatus.AT_DROPOFF]: 'bg-orange-100 text-orange-800',
  [OrderStatus.DELIVERED]: 'bg-green-100 text-green-800',
  [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800',
  [OrderStatus.FAILED]: 'bg-red-100 text-red-800',
};

// Libellé en français simple à afficher à l'écran à la place du code brut
// (ex: "En attente" plutôt que "PENDING"), pour que n'importe qui — pas
// seulement un développeur — comprenne le statut d'une commande au premier
// coup d'œil.
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'En attente',
  [OrderStatus.ASSIGNED]: 'Assignée',
  [OrderStatus.ACCEPTED]: 'Acceptée',
  [OrderStatus.EN_ROUTE_TO_PICKUP]: 'Vers collecte',
  [OrderStatus.AT_PICKUP]: 'À la collecte',
  [OrderStatus.PICKED_UP]: 'Colis récupéré',
  [OrderStatus.IN_TRANSIT]: 'En livraison',
  [OrderStatus.AT_DROPOFF]: 'À la livraison',
  [OrderStatus.DELIVERED]: 'Livrée',
  [OrderStatus.CANCELLED]: 'Annulée',
  [OrderStatus.FAILED]: 'Échec',
};

// Phrase un peu plus longue, pour une infobulle ou un panneau de détail où
// on veut expliquer POURQUOI ce statut existe, pas juste le nommer.
export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "La commande a été créée mais aucun livreur n'a encore été assigné.",
  [OrderStatus.ASSIGNED]: "Un livreur a été désigné pour cette commande, mais ne l'a pas encore acceptée.",
  [OrderStatus.ACCEPTED]: "Le livreur a accepté la commande et va se rendre au point de collecte.",
  [OrderStatus.EN_ROUTE_TO_PICKUP]: 'Le livreur se déplace actuellement vers le point de collecte.',
  [OrderStatus.AT_PICKUP]: 'Le livreur est arrivé sur le lieu de collecte du colis.',
  [OrderStatus.PICKED_UP]: 'Le colis a été récupéré par le livreur et va être acheminé.',
  [OrderStatus.IN_TRANSIT]: 'Le colis est en route vers le destinataire.',
  [OrderStatus.AT_DROPOFF]: 'Le livreur est arrivé sur le lieu de livraison.',
  [OrderStatus.DELIVERED]: 'Le colis a été livré avec succès au destinataire.',
  [OrderStatus.CANCELLED]: "La commande a été annulée avant d'être livrée.",
  [OrderStatus.FAILED]: "La livraison n'a pas pu être menée à terme (ex: destinataire injoignable, adresse introuvable).",
};

export const RIDER_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  BUSY: 'bg-amber-50 text-amber-600 border-amber-100',
  INACTIVE: 'bg-slate-100 text-slate-500 border-slate-200',
};