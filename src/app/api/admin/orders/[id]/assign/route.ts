import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { validateTransition } from '@/lib/order-state-machine';
import { OrderStatus, RiderStatus } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER') {
      return errorResponse('Seuls les dispatchers peuvent assigner des livreurs', 403);
    }

    const { id } = await params;
    const { riderId } = await req.json();

    if (!riderId) return errorResponse('ID du livreur requis', 400);

    const [order, rider] = await Promise.all([
      db.order.findUnique({ where: { id } }),
      db.rider.findUnique({ where: { id: riderId } }),
    ]);

    if (!order) return errorResponse('Commande non trouvée', 404);
    if (!rider) return errorResponse('Livreur non trouvé', 404);

    if (rider.status !== RiderStatus.ACTIVE) {
      return errorResponse('Le livreur n\'est pas disponible (doit être en statut ACTIVE)', 400);
    }

    validateTransition(order.status, OrderStatus.ASSIGNED);

    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        status: OrderStatus.ASSIGNED,
        riderId: rider.id,
        statusHistory: {
          create: {
            status: OrderStatus.ASSIGNED,
            note: `Livreur ${rider.name} assigné`,
          },
        },
      },
    });

    // Le livreur passe "en course" : il ne doit plus apparaître comme
    // disponible pour une autre assignation tant que celle-ci n'est pas terminée.
    await db.rider.update({
      where: { id: rider.id },
      data: { status: RiderStatus.BUSY },
    });

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    if (error.status === 409) return errorResponse(error.message, 409);
    console.error('Order assign error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
