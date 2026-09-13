import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { validateTransition } from '@/lib/order-state-machine';
import { OrderStatus, RiderStatus, ClaimStatus } from '@prisma/client';

/**
 * POST /api/admin/orders/[id]/claims/[claimId]/approve
 *
 * Valide la demande d'un chauffeur : assigne la commande (même logique que
 * /api/admin/orders/[id]/assign), passe son statut à BUSY, et rejette
 * automatiquement toutes les autres demandes en attente pour cette même
 * commande (un seul chauffeur peut l'avoir).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER') {
      return errorResponse('Seuls les dispatchers peuvent valider une prise en charge', 403);
    }

    const { id, claimId } = await params;

    const claim = await db.orderClaim.findUnique({
      where: { id: claimId },
      include: { rider: true },
    });
    if (!claim || claim.orderId !== id) return errorResponse('Demande introuvable', 404);
    if (claim.status !== ClaimStatus.PENDING) return errorResponse('Cette demande a déjà été traitée', 409);

    const order = await db.order.findUnique({ where: { id } });
    if (!order) return errorResponse('Commande non trouvée', 404);

    validateTransition(order.status, OrderStatus.ASSIGNED);

    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        status: OrderStatus.ASSIGNED,
        riderId: claim.riderId,
        statusHistory: {
          create: {
            status: OrderStatus.ASSIGNED,
            note: `Livreur ${claim.rider.name} validé (demande de prise en charge)`,
          },
        },
      },
    });

    await db.rider.update({
      where: { id: claim.riderId },
      data: { status: RiderStatus.BUSY },
    });

    // Cette demande est approuvée, toutes les autres demandes en attente
    // pour la même commande deviennent automatiquement rejetées.
    await db.orderClaim.update({ where: { id: claimId }, data: { status: ClaimStatus.APPROVED } });
    await db.orderClaim.updateMany({
      where: { orderId: id, status: ClaimStatus.PENDING, id: { not: claimId } },
      data: { status: ClaimStatus.REJECTED },
    });

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    if (error.status === 409) return errorResponse(error.message, 409);
    console.error('Claim approve error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
