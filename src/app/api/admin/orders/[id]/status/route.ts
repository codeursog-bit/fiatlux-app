import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { validateTransition } from '@/lib/order-state-machine';
import { haversineDistanceMeters } from '@/lib/geo';
import { OrderStatus, ConfirmationStep, ConfirmationActor, ConfirmationAction, RiderStatus, DeliveryType, PickupControlMode, DisputeType, DisputeStatus } from '@prisma/client';
import { runDisputeDetection } from '@/lib/dispute-detection';

/**
 * Generic route for status transitions (EN_ROUTE_TO_PICKUP, AT_PICKUP, etc.)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const { status, lat, lng, note } = await req.json();

    if (!status) return errorResponse('Statut requis', 400);

    const order = await db.order.findUnique({ where: { id } });
    if (!order) return errorResponse('Commande non trouvée', 404);

    // Verify permission: Only assigned rider or admin/dispatcher can change status
    if (auth.role !== 'DISPATCHER' && auth.role !== 'ADMIN' && order.riderId !== auth.id) {
       return errorResponse('Vous n\'êtes pas autorisé à mettre à jour cette commande', 403);
    }

    validateTransition(order.status, status as OrderStatus);

    // Double confirmation verification for PICKED_UP and DELIVERED
    // Exception : commande "Moi-même" en mode AUTO — pas de tiers avec
    // l'app en main au point de collecte, le client a choisi de laisser la
    // main à l'app. Le blocage GPS à 100m (juste après) fait déjà office de
    // vérification ; on ne bloque pas en plus sur une confirmation qui
    // n'aurait personne pour la donner.
    const skipPickupConfirmation =
      status === OrderStatus.PICKED_UP &&
      order.deliveryType === DeliveryType.SELF &&
      order.pickupControlMode === PickupControlMode.AUTO;

    if (!skipPickupConfirmation && (status === OrderStatus.PICKED_UP || status === OrderStatus.DELIVERED)) {
      const step = status === OrderStatus.PICKED_UP ? ConfirmationStep.PICKUP : ConfirmationStep.DROPOFF;
      const actor = status === OrderStatus.PICKED_UP ? ConfirmationActor.SENDER : ConfirmationActor.RECIPIENT;

      const confirmation = await db.confirmation.findFirst({
        where: {
          orderId: id,
          step: step,
          actor: actor,
          action: ConfirmationAction.CONFIRMED
        }
      });

      if (!confirmation) {
        return errorResponse(`En attente de la confirmation du ${actor === ConfirmationActor.SENDER ? 'client (expéditeur)' : 'destinataire'} via son lien de suivi.`, 403);
      }

      // Record rider confirmation as well
      await db.confirmation.create({
        data: {
          orderId: id,
          step: step,
          actor: ConfirmationActor.RIDER,
          action: ConfirmationAction.CONFIRMED,
          lat: lat ? parseFloat(lat) : null,
          lng: lng ? parseFloat(lng) : null,
        }
      });

      // Un litige "mismatch" avait pu être ouvert automatiquement (voir
      // runDisputeDetection) parce que le chauffeur avait mis plus de 15 min
      // à confirmer après le client — souvent un simple retard, pas une
      // vraie fraude. Sa confirmation vient d'arriver : le problème qui
      // avait déclenché l'alerte n'existe plus, on referme le litige tout
      // seul plutôt que de laisser "Litige en cours" affiché indéfiniment
      // au client sur une commande qui s'est en fait terminée normalement.
      const mismatchType = step === ConfirmationStep.PICKUP ? DisputeType.PICKUP_MISMATCH : DisputeType.DROPOFF_MISMATCH;
      await db.dispute.updateMany({
        where: { orderId: id, type: mismatchType, status: DisputeStatus.OPEN },
        data: {
          status: DisputeStatus.RESOLVED,
          resolution: 'Résolu automatiquement — confirmation du chauffeur reçue a posteriori.',
          resolvedAt: new Date(),
        },
      });
    }

    // Geographic verification for AT_PICKUP and AT_DROPOFF
    if (status === OrderStatus.AT_PICKUP || status === OrderStatus.AT_DROPOFF) {
      // Use provided lat/lng or last known rider position
      let checkLat = lat;
      let checkLng = lng;

      if (checkLat === undefined || checkLng === undefined) {
        const rider = await db.rider.findUnique({ where: { id: order.riderId! } });
        checkLat = rider?.currentLat;
        checkLng = rider?.currentLng;
      }

      if (checkLat === undefined || checkLng === undefined) {
        return errorResponse('Position GPS requise pour valider l\'arrivée sur zone', 400);
      }

      const targetLat = status === OrderStatus.AT_PICKUP ? order.pickupLat : order.dropoffLat;
      const targetLng = status === OrderStatus.AT_PICKUP ? order.pickupLng : order.dropoffLng;

      const distance = haversineDistanceMeters(checkLat, checkLng, targetLat, targetLng);
      
      if (distance > 100) {
        return errorResponse(`Position trop éloignée du point attendu (${Math.round(distance)}m). Vous devez être à moins de 100m.`, 409);
      }
    }

    // Cohérence paiement espèces : si des espèces sont dues à cette étape
    // précise, on refuse la transition tant que le chauffeur n'a pas
    // explicitement confirmé les avoir reçues — sinon l'étape paiement est
    // simplement sautée côté API aussi, pas seulement côté UI.
    const cashGate =
      (status === OrderStatus.PICKED_UP && order.paymentMethod === 'CASH_AT_PICKUP') ||
      (status === OrderStatus.DELIVERED && order.paymentMethod === 'CASH_AT_DELIVERY');

    if (cashGate) {
      const riderCashConfirmed = await db.confirmation.findFirst({
        where: {
          orderId: id,
          step: ConfirmationStep.CASH_PAYMENT,
          actor: ConfirmationActor.RIDER,
          action: ConfirmationAction.CONFIRMED,
        }
      });
      if (!riderCashConfirmed) {
        return errorResponse('Confirmez d\'abord avoir reçu le paiement en espèces.', 403);
      }
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        status: status as OrderStatus,
        statusHistory: {
          create: {
            status: status as OrderStatus,
            lat,
            lng,
            note,
          },
        },
      },
    });

    // Déclencher la détection (optionnel, peut être asynchrone)
    runDisputeDetection().catch(e => console.error("Triggered detection error:", e));

    // Course terminée (livrée, annulée ou échouée) : le livreur redevient
    // disponible pour une nouvelle commande.
    const TERMINAL_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.FAILED];
    if (order.riderId && TERMINAL_STATUSES.includes(status as OrderStatus)) {
      await db.rider.update({
        where: { id: order.riderId },
        data: { status: RiderStatus.ACTIVE },
      });
    }

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    if (error.status === 409) return errorResponse(error.message, 409);
    console.error('Order status transition error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}