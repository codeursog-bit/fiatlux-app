import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { ClaimStatus } from '@prisma/client';

/**
 * POST /api/admin/orders/[id]/claims/[claimId]/reject
 * Rejette une demande sans assigner personne — la commande reste
 * disponible pour les autres chauffeurs (ou une autre demande en attente).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER') {
      return errorResponse('Seuls les dispatchers peuvent rejeter une demande', 403);
    }

    const { id, claimId } = await params;
    const claim = await db.orderClaim.findUnique({ where: { id: claimId } });
    if (!claim || claim.orderId !== id) return errorResponse('Demande introuvable', 404);
    if (claim.status !== ClaimStatus.PENDING) return errorResponse('Cette demande a déjà été traitée', 409);

    await db.orderClaim.update({ where: { id: claimId }, data: { status: ClaimStatus.REJECTED } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    return errorResponse('Erreur serveur', 500);
  }
}
