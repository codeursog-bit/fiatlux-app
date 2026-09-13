import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { ConfirmationStep, ConfirmationActor, ConfirmationAction, DisputeType, DisputeStatus } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const { step, reason, lat, lng } = await req.json();

    if (!step || !reason) {
      return errorResponse('Étape et raison requises', 400);
    }

    const order = await db.order.findUnique({ where: { id } });
    if (!order) return errorResponse('Commande non trouvée', 404);

    // Seul le livreur assigné peut contester
    if (order.riderId !== auth.id && auth.role !== 'ADMIN') {
      return errorResponse('Action non autorisée', 403);
    }

    // 1. Créer la confirmation DENIED
    await db.confirmation.create({
      data: {
        orderId: id,
        step: step as ConfirmationStep,
        actor: ConfirmationActor.RIDER,
        action: ConfirmationAction.DENIED,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      }
    });

    // 2. Déclencher automatiquement une Dispute
    let disputeType: DisputeType = DisputeType.PICKUP_MISMATCH;
    if (step === ConfirmationStep.DROPOFF) disputeType = DisputeType.DROPOFF_MISMATCH;

    await db.dispute.create({
      data: {
        orderId: id,
        type: disputeType,
        description: `Contestation du livreur lors de l'étape ${step}: ${reason}`,
        status: DisputeStatus.OPEN,
      }
    });

    // Optionnel: On peut aussi ajouter une alerte système
    await db.alert.create({
      data: {
        type: 'PAYMENT', // Ou un nouveau type DISPUTE si existant
        title: `Litige ouvert sur la commande ${order.trackingNumber}`,
        description: `Le livreur a contesté l'étape ${step}.`,
        orderId: id,
        riderId: order.riderId,
      }
    });

    return NextResponse.json({ success: true, message: 'Contestation enregistrée et litige ouvert' });

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Rider deny error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
