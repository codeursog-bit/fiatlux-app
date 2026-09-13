import { db } from "./db";
import { 
  OrderStatus, 
  ConfirmationStep, 
  ConfirmationActor, 
  DeliveryType,
  PickupControlMode,
  ConfirmationAction, 
  DisputeType, 
  DisputeStatus,
  AlertType
} from "@prisma/client";

/**
 * Logique de détection des litiges et alertes de blocage (Stalls)
 */
export async function runDisputeDetection() {
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);

  console.log(`[DisputeDetection] Running detection at ${now.toISOString()}`);

  // 1. Détection des Mismatches (Confirmations client orphelines)
  // On cherche les confirmations SENDER/RECIPIENT qui n'ont pas de réponse RIDER après 15 min
  const clientConfirmations = await db.confirmation.findMany({
    where: {
      actor: { in: [ConfirmationActor.SENDER, ConfirmationActor.RECIPIENT] },
      action: ConfirmationAction.CONFIRMED,
      createdAt: { lt: fifteenMinutesAgo },
    },
    include: {
      order: {
        include: {
          disputes: {
            where: { status: DisputeStatus.OPEN }
          }
        }
      }
    }
  });

  for (const conf of clientConfirmations) {
    // Livraison "à soi-même" en mode AUTO : la confirmation du livreur à
    // l'étape PICKUP est volontairement sautée ailleurs dans le code (voir
    // skipPickupConfirmation dans /api/admin/orders/[id]/status) — il n'y a
    // personne d'autre que le client pour la donner. Ce n'est donc pas un
    // signe de litige, juste l'absence attendue d'une étape qui n'existe
    // pas pour ce type de commande.
    const isSelfAutoPickupSkip =
      conf.step === ConfirmationStep.PICKUP &&
      conf.order.deliveryType === DeliveryType.SELF &&
      conf.order.pickupControlMode === PickupControlMode.AUTO;
    if (isSelfAutoPickupSkip) continue;

    // Vérifier si une confirmation RIDER existe pour la même étape
    const riderConf = await db.confirmation.findFirst({
      where: {
        orderId: conf.orderId,
        step: conf.step,
        actor: ConfirmationActor.RIDER,
      }
    });

    if (!riderConf) {
      // Pas de confirmation du livreur -> Litige potentiel
      // Vérifier si un litige n'est pas déjà ouvert
      if (conf.order.disputes.length === 0) {
        const type = conf.step === ConfirmationStep.PICKUP ? DisputeType.PICKUP_MISMATCH : DisputeType.DROPOFF_MISMATCH;
        
        await db.dispute.create({
          data: {
            orderId: conf.orderId,
            type: type,
            description: `Le client a confirmé l'étape ${conf.step} il y a plus de 15 minutes, mais le livreur n'a pas encore confirmé.`
          }
        });
        console.log(`[DisputeDetection] Dispute created for Order ${conf.orderId} (Mismatch ${conf.step})`);
      }
    }
  }

  // 2. Détection des Stalls (Chauffeur arrivé mais client ne confirme pas)
  // On cherche les commandes bloquées à AT_PICKUP ou AT_DROPOFF depuis 20 min
  const stalledOrders = await db.order.findMany({
    where: {
      status: { in: [OrderStatus.AT_PICKUP, OrderStatus.AT_DROPOFF] },
      updatedAt: { lt: twentyMinutesAgo },
    },
    include: {
      alerts: {
        where: { type: AlertType.STALL, resolved: false }
      },
      confirmations: true
    }
  });

  for (const order of stalledOrders) {
    const isSelfAutoPickup =
      order.status === OrderStatus.AT_PICKUP &&
      order.deliveryType === DeliveryType.SELF &&
      order.pickupControlMode === PickupControlMode.AUTO;
    if (isSelfAutoPickup) continue;

    const step = order.status === OrderStatus.AT_PICKUP ? ConfirmationStep.PICKUP : ConfirmationStep.DROPOFF;
    const clientConfirmed = order.confirmations.some(c => 
      c.step === step && 
      (c.actor === ConfirmationActor.SENDER || c.actor === ConfirmationActor.RECIPIENT) &&
      c.action === ConfirmationAction.CONFIRMED
    );

    if (!clientConfirmed && order.alerts.length === 0) {
      // Le livreur attend depuis 20 min sans confirmation client -> Alerte
      await db.alert.create({
        data: {
          type: AlertType.STALL,
          title: `Attente prolongée à ${order.status === OrderStatus.AT_PICKUP ? 'l\'enlèvement' : 'la livraison'}`,
          description: `La commande ${order.trackingNumber} est au statut ${order.status} depuis plus de 20 minutes sans confirmation client.`,
          orderId: order.id,
          riderId: order.riderId,
        }
      });
      console.log(`[DisputeDetection] Stall alert created for Order ${order.id}`);
    }
  }
}