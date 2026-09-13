import { db } from "./db";
import { TrackingRole, OrderStatus } from "@prisma/client";

const TERMINAL_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.FAILED];

export async function resolveTrackingToken(token: string) {
  const link = await db.trackingLink.findUnique({
    where: { token },
    include: {
      order: {
        include: {
          rider: {
            select: {
              id: true,
              name: true,
              phone: true,
              vehiclePlate: true,
              currentLat: true,
              currentLng: true,
            }
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 6
          },
          gpsPings: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          confirmations: {
            orderBy: { createdAt: 'desc' }
          }
        }
      }
    }
  });

  if (!link) return null;

  // Une commande encore en cours ne doit jamais expirer pour son client —
  // sinon une livraison qui traîne (chauffeur lent, test resté ouvert...)
  // verrouille définitivement le client hors de sa PROPRE commande active.
  // Une fois la commande terminée (livrée/annulée/échouée), le lien reste
  // valide encore quelques jours (délai de grâce pour noter/contester),
  // calculé depuis la fin réelle de la commande (order.updatedAt), pas
  // depuis sa création — l'ancien expiresAt fixe pouvait expirer le jour
  // même où la commande se terminait si elle avait mis plus de 7 jours.
  const isTerminal = TERMINAL_STATUSES.includes(link.order.status);
  if (isTerminal) {
    const gracePeriodMs = 7 * 24 * 60 * 60 * 1000;
    const expiredSinceCompletion = Date.now() - link.order.updatedAt.getTime() > gracePeriodMs;
    if (expiredSinceCompletion) return null;
  }

  return {
    order: link.order,
    role: link.role,
    phone: link.phone
  };
}