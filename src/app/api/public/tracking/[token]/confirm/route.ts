import { NextRequest, NextResponse } from 'next/server';
import { resolveTrackingToken } from '@/lib/tracking-auth';
import { db } from '@/lib/db';
import { OrderStatus, TrackingRole, ConfirmationStep, ConfirmationActor, ConfirmationAction } from '@prisma/client';
import { runDisputeDetection } from '@/lib/dispute-detection';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { lat, lng, step: requestedStep } = await req.json();
    
    const result = await resolveTrackingToken(token);

    if (!result) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    const { order, role } = result;

    let step: ConfirmationStep;

    // 1. Logique de paiement en espèces
    if (requestedStep === 'CASH_PAYMENT') {
      const isSelf = order.deliveryType === 'SELF';
      const isPayer = isSelf ||
                      (role === TrackingRole.SENDER && order.paymentMethod === 'CASH_AT_PICKUP') ||
                      (role === TrackingRole.RECIPIENT && order.paymentMethod === 'CASH_AT_DELIVERY');
      
      if (!isPayer) {
        return NextResponse.json({ error: 'Vous n\'êtes pas le payeur désigné pour cette commande' }, { status: 403 });
      }

      // Le paiement peut être confirmé dès que le livreur est là (AT_PICKUP ou AT_DROPOFF)
      const validStatus = isSelf
                          ? (order.status === OrderStatus.AT_PICKUP || order.status === OrderStatus.AT_DROPOFF)
                          : (role === TrackingRole.SENDER && order.status === OrderStatus.AT_PICKUP) ||
                            (role === TrackingRole.RECIPIENT && order.status === OrderStatus.AT_DROPOFF);
      
      if (!validStatus) {
        return NextResponse.json({ error: 'Le paiement ne peut être confirmé qu\'en présence du livreur' }, { status: 409 });
      }

      step = ConfirmationStep.CASH_PAYMENT;
    } 
    // 2. Logique de confirmation de colis (défaut)
    else {
      // Livraison "pour soi-même" : un seul lien existe, sa personne agit
      // à la fois comme expéditeur ET destinataire. On valide donc l'étape
      // qui correspond au statut ACTUEL de la commande, sans exiger que le
      // rôle enregistré sur le lien corresponde pile à cette étape.
      if (order.deliveryType === 'SELF') {
        if (order.status === OrderStatus.AT_PICKUP) {
          step = ConfirmationStep.PICKUP;
        } else if (order.status === OrderStatus.AT_DROPOFF) {
          step = ConfirmationStep.DROPOFF;
        } else {
          return NextResponse.json({ error: 'La confirmation n\'est pas possible à ce stade' }, { status: 409 });
        }
      } else if (role === TrackingRole.SENDER) {
        if (order.status !== OrderStatus.AT_PICKUP) {
          return NextResponse.json({ error: 'La confirmation n\'est pas possible à ce stade' }, { status: 409 });
        }
        step = ConfirmationStep.PICKUP;
      } else if (role === TrackingRole.RECIPIENT) {
        if (order.status !== OrderStatus.AT_DROPOFF) {
          return NextResponse.json({ error: 'La confirmation n\'est pas possible à ce stade' }, { status: 409 });
        }
        step = ConfirmationStep.DROPOFF;
      } else {
        return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 });
      }
    }

    // Créer la confirmation
    // L'acteur se déduit de l'étape confirmée (pas du rôle du lien) : pour
    // une livraison à soi-même, le même lien confirme PICKUP puis DROPOFF
    // à deux moments différents, en agissant respectivement comme
    // expéditeur puis comme destinataire.
    await db.confirmation.create({
      data: {
        orderId: order.id,
        step,
        actor: step === ConfirmationStep.PICKUP ? ConfirmationActor.SENDER : ConfirmationActor.RECIPIENT,
        action: ConfirmationAction.CONFIRMED,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      }
    });

    // Déclencher la détection (optionnel, peut être asynchrone)
    runDisputeDetection().catch(e => console.error("Triggered detection error:", e));

    return NextResponse.json({ success: true, message: 'Confirmation enregistrée' });

  } catch (error) {
    console.error('Confirmation API error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}