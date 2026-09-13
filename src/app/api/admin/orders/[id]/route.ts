import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { validateTransition } from '@/lib/order-state-machine';
import { OrderStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req);
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        customer: true,
        rider: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        otpCodes: true,
        alerts: true,
      },
    });

    if (!order) {
      return errorResponse('Commande non trouvée', 404);
    }

    return NextResponse.json(order);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();

    const order = await db.order.findUnique({ where: { id } });
    if (!order) return errorResponse('Commande non trouvée', 404);

    const updates: any = {};
    const historyCreate: any[] = [];

    // Case 1: Cancellation
    if (body.status === OrderStatus.CANCELLED) {
      validateTransition(order.status, OrderStatus.CANCELLED);
      updates.status = OrderStatus.CANCELLED;
      updates.cancelReason = body.cancelReason || 'Annulée par l\'utilisateur';
      historyCreate.push({
        status: OrderStatus.CANCELLED,
        note: updates.cancelReason,
      });
    }

    // Case 2: Failure
    if (body.status === OrderStatus.FAILED) {
      validateTransition(order.status, OrderStatus.FAILED);
      updates.status = OrderStatus.FAILED;
      updates.failureReason = body.failureReason || 'Échec de livraison';
      historyCreate.push({
        status: OrderStatus.FAILED,
        note: updates.failureReason,
      });
    }

    // Case 3: Fixation du montant final pour une commande "sur devis"
    // (le tarif n'est jamais recalculé automatiquement — c'est toujours
    // un montant saisi à la main par l'admin).
    if (body.amount != null) {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return errorResponse('Montant invalide', 400);
      }
      updates.amount = amount;
      updates.quotedManually = false;
      historyCreate.push({
        status: order.status,
        note: `Montant fixé par l'admin : ${amount.toLocaleString()} FCFA`,
      });
    }

    // Apply other updates if any (dispatcher can edit some fields if pending)
    if (order.status === OrderStatus.PENDING && auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER') {
        // Limited editing for pending
        if (body.packageDescription) updates.packageDescription = body.packageDescription;
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        ...updates,
        statusHistory: {
          create: historyCreate,
        },
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    if (error.status === 409) return errorResponse(error.message, 409);
    console.error('Order PATCH error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
