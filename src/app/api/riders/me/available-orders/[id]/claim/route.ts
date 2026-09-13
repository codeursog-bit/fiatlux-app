import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { OrderStatus, ClaimStatus } from '@prisma/client';

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.ASSIGNED,
  OrderStatus.ACCEPTED,
  OrderStatus.EN_ROUTE_TO_PICKUP,
  OrderStatus.AT_PICKUP,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_TRANSIT,
  OrderStatus.AT_DROPOFF,
];

// Nombre maximum de commandes actives qu'un même chauffeur peut avoir en
// même temps. À 2 motos, on garde 1 pour ne pas qu'un chauffeur accapare
// plusieurs courses pendant que l'autre n'a rien.
const MAX_ACTIVE_ORDERS_PER_RIDER = 1;

/**
 * POST /api/riders/me/available-orders/[id]/claim
 *
 * Ne assigne PLUS la commande directement : crée une demande de prise en
 * charge (OrderClaim, statut PENDING). C'est l'admin qui valide ensuite
 * (voir /api/admin/orders/[id]/claims/[claimId]/approve) — parmi plusieurs
 * chauffeurs qui auraient demandé la même commande, un seul sera retenu.
 * La commande ne disparaît de la liste des commandes disponibles qu'une
 * fois réellement assignée par l'admin, pas au moment de la demande.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, { role: 'rider' });
    if (!auth.riderId) {
      return errorResponse('Non autorisé', 401);
    }
    const { id } = await params;

    const activeCount = await db.order.count({
      where: { riderId: auth.riderId, status: { in: ACTIVE_STATUSES } },
    });

    if (activeCount >= MAX_ACTIVE_ORDERS_PER_RIDER) {
      return errorResponse(
        'Terminez votre course en cours avant d\'en demander une nouvelle',
        409
      );
    }

    const order = await db.order.findUnique({ where: { id }, select: { id: true, status: true, riderId: true } });
    if (!order) {
      return errorResponse('Commande introuvable', 404);
    }
    if (order.status !== OrderStatus.PENDING || order.riderId) {
      return errorResponse('Cette commande a déjà été prise en charge', 409);
    }

    // Idempotent : si le chauffeur avait déjà demandé cette commande, on ne
    // recrée pas de doublon (contrainte unique [orderId, riderId]) — on
    // confirme juste que la demande est toujours en attente.
    const claim = await db.orderClaim.upsert({
      where: { orderId_riderId: { orderId: id, riderId: auth.riderId } },
      update: {},
      create: { orderId: id, riderId: auth.riderId, status: ClaimStatus.PENDING },
    });

    return NextResponse.json({ claim, message: 'Demande envoyée — en attente de validation par un admin.' });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Claim order error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}