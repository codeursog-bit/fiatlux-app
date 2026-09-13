import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';

/**
 * GET /api/admin/orders/[id]/claims
 * Liste les chauffeurs qui ont demandé cette commande, du plus récent au
 * plus ancien, avec leur statut (PENDING/APPROVED/REJECTED).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(req, { role: 'admin' });
    const { id } = await params;

    const claims = await db.orderClaim.findMany({
      where: { orderId: id },
      include: {
        rider: { select: { id: true, name: true, phone: true, vehiclePlate: true, rating: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(claims);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    return errorResponse('Erreur serveur', 500);
  }
}
