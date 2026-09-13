import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/auth";
import { ConfirmationStep, ConfirmationActor, ConfirmationAction, PaymentStatus, PaymentTransactionStatus } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const { lat, lng } = await req.json();

    const order = await db.order.findUnique({
      where: { id },
      include: {
        confirmations: {
          where: {
            step: ConfirmationStep.CASH_PAYMENT,
            action: ConfirmationAction.CONFIRMED,
            actor: { in: [ConfirmationActor.SENDER, ConfirmationActor.RECIPIENT] }
          }
        }
      }
    });

    if (!order) {
      return errorResponse("Commande non trouvée", 404);
    }

    // Vérifier que c'est bien le livreur assigné (ou un admin)
    if (order.riderId !== auth.id && auth.role !== "ADMIN") {
      return errorResponse("Action non autorisée", 403);
    }

    // Vérifier si le client a déjà confirmé
    if (order.confirmations.length === 0) {
      return errorResponse("En attente de la confirmation de paiement du client.", 403);
    }

    // 1. Enregistrer la confirmation du livreur
    await db.confirmation.create({
      data: {
        orderId: id,
        step: ConfirmationStep.CASH_PAYMENT,
        actor: ConfirmationActor.RIDER,
        action: ConfirmationAction.CONFIRMED,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      }
    });

    // 2. Créer une transaction de paiement CONFIRMED
    await db.paymentTransaction.create({
      data: {
        orderId: id,
        method: order.paymentMethod,
        amount: order.amount,
        status: PaymentTransactionStatus.CONFIRMED,
        confirmedBySenderOrRecipient: true,
        confirmedByRider: true,
      }
    });

    // 3. Mettre à jour le statut de l'ordre
    await db.order.update({
      where: { id },
      data: { paymentStatus: PaymentStatus.PAID }
    });

    return NextResponse.json({
      success: true,
      message: "Paiement en espèces confirmé et enregistré"
    });

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error("Cash received error:", error);
    return errorResponse("Erreur serveur", 500);
  }
}
