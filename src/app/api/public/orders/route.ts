import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, TrackingRole, PaymentMethod, DeliveryType, PickupControlMode } from "@prisma/client";
import { sendSms } from "@/lib/sms";
import { isRateLimited } from "@/lib/rate-limit";
import { getRoute } from "@/lib/routing";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // 0. Rate limiting by IP
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (isRateLimited(`order-create-${ip}`, 5, 60000)) {
      return NextResponse.json({ error: "Trop de requêtes. Veuillez patienter une minute." }, { status: 429 });
    }

    const data = await req.json();

    // 1. Tarif : toujours choisi manuellement (1000 / 1500 / 2000 FCFA) ou
    // laissé "sur devis" (quotedManually = true, montant fixé plus tard par
    // un admin). Aucun calcul automatique par zone/distance.
    const ALLOWED_TIERS = [1000, 1500, 2000];
    let amount: number;
    let quotedManually: boolean;

    if (data.quotedManually === true) {
      quotedManually = true;
      amount = 0;
    } else if (ALLOWED_TIERS.includes(data.amount)) {
      quotedManually = false;
      amount = data.amount;
    } else {
      return NextResponse.json(
        { error: "Montant invalide : choisissez 1000, 1500, 2000 FCFA ou \"Sur devis\"" },
        { status: 400 }
      );
    }

    // 1bis. Résolution des coordonnées depuis les repères choisis, si
    // fournis — sinon on retombe sur pickupLat/Lng bruts (ex: position
    // GPS captée directement côté client quand aucun repère ne correspond).
    // Les zones (pickupZone/dropoffZone) restent enregistrées à titre
    // informatif/statistique uniquement — elles ne déterminent plus le prix.
    let pickupLat = data.pickupLat;
    let pickupLng = data.pickupLng;
    let dropoffLat = data.dropoffLat;
    let dropoffLng = data.dropoffLng;
    let resolvedZoneFrom = data.zoneFrom;
    let resolvedZoneTo = data.zoneTo;

    if (data.pickupLandmarkId) {
      const landmark = await db.landmark.findUnique({ where: { id: data.pickupLandmarkId } });
      if (landmark) {
        pickupLat = landmark.lat;
        pickupLng = landmark.lng;
        if (landmark.pricingZoneId) resolvedZoneFrom = landmark.pricingZoneId;
      }
    }

    if (data.dropoffLandmarkId) {
      const landmark = await db.landmark.findUnique({ where: { id: data.dropoffLandmarkId } });
      if (landmark) {
        dropoffLat = landmark.lat;
        dropoffLng = landmark.lng;
        if (landmark.pricingZoneId) resolvedZoneTo = landmark.pricingZoneId;
      }
    }

    // 1ter. Trajet routier (amélioration visuelle, jamais bloquant) — on
    // le calcule seulement si on a de vraies coordonnées des deux côtés.
    let routeGeoJson: any = null;
    if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
      const route = await getRoute(pickupLat, pickupLng, dropoffLat, dropoffLng);
      if (route) routeGeoJson = route.geoJson;
    }

    // 1quater. Type de livraison — SELF (le client se fait livrer à
    // lui-même) autorise un choix de mode de collecte ; THIRD_PARTY garde
    // le comportement historique (confirmation expéditeur obligatoire).
    const deliveryType: DeliveryType = data.deliveryType === 'SELF' ? 'SELF' : 'THIRD_PARTY';
    let pickupControlMode: PickupControlMode | null = null;
    if (deliveryType === 'SELF') {
      if (data.pickupControlMode !== 'AUTO' && data.pickupControlMode !== 'MANUAL') {
        return NextResponse.json(
          { error: "Précisez le mode de collecte (laisser la main ou garder le contrôle)" },
          { status: 400 }
        );
      }
      pickupControlMode = data.pickupControlMode;
    }

    // 2 & 3. Création de l'Order et des TrackingLinks en transaction
    const { order, senderToken, recipientToken } = await db.$transaction(async (tx) => {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(1000 + Math.random() * 9000);
      const trackingNumber = `EXP-${timestamp}-${random}`;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const sToken = crypto.randomUUID();
      const rToken = crypto.randomUUID();

      const newOrder = await tx.order.create({
        data: {
          trackingNumber,
          guestCustomerName: data.guestCustomerName || data.senderName,
          guestCustomerPhone: data.guestCustomerPhone || data.senderPhone,
          pickupAddress: data.pickupAddress,
          pickupLat: pickupLat || 0,
          pickupLng: pickupLng || 0,
          pickupZone: resolvedZoneFrom,
          pickupLandmarkId: data.pickupLandmarkId || null,
          dropoffAddress: data.dropoffAddress,
          dropoffLat: dropoffLat || 0,
          dropoffLng: dropoffLng || 0,
          dropoffZone: resolvedZoneTo,
          dropoffLandmarkId: data.dropoffLandmarkId || null,
          recipientName: data.recipientName,
          recipientPhone: data.recipientPhone,
          deliveryType,
          pickupControlMode,
          packageDescription: data.packageDescription,
          packageWeight: data.packageWeight,
          declaredValue: data.declaredValue,
          amount,
          paymentMethod: data.paymentMethod as PaymentMethod,
          cashPaymentSubtype: data.cashPaymentSubtype,
          quotedManually,
          routeGeoJson: routeGeoJson || undefined,
          status: OrderStatus.PENDING,
          senderToken: sToken,
          recipientToken: rToken,
          statusHistory: {
            create: {
              status: OrderStatus.PENDING,
              note: "Commande créée via le portail public",
            }
          }
        }
      });

      await tx.trackingLink.createMany({
        data: [
          {
            orderId: newOrder.id,
            token: sToken,
            role: TrackingRole.SENDER,
            phone: data.guestCustomerPhone || data.senderPhone,
            expiresAt,
          },
          {
            orderId: newOrder.id,
            token: rToken,
            role: TrackingRole.RECIPIENT,
            phone: data.recipientPhone,
            expiresAt,
          }
        ]
      });

      return { order: newOrder, senderToken: sToken, recipientToken: rToken };
    });

    // 4. Envoi des SMS
    // Le système de SMS n'étant pas encore fiable à 100%, la réponse
    // renvoie aussi le recipientToken (voir plus bas) pour que la personne
    // qui crée la commande puisse elle-même transmettre le lien "à
    // partager" (WhatsApp, etc.) au destinataire — pas seulement compter
    // sur le SMS.
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://fiatlux.cg";

    const senderPhone = data.guestCustomerPhone || data.senderPhone;

    if (deliveryType === 'SELF') {
      // Livraison "pour soi-même" (ex: se faire livrer un plat de
      // restaurant) : une seule et même personne suit toute la course —
      // collecte ET livraison — avec un seul lien. Pas de second lien à
      // gérer/partager.
      const selfMsg = `FIATLUX: Votre commande ${order.trackingNumber} est enregistrée. Suivez toute la course (collecte et livraison) ici: ${baseUrl}/suivi/${senderToken}`;
      await sendSms(senderPhone, selfMsg).catch(err => console.error("SMS Sending failed:", err));
    } else {
      // Livraison à un tiers : deux personnes, deux liens distincts — la
      // personne qui crée la commande ne voit et ne suit QUE la collecte
      // par défaut (via son propre lien), et doit transmettre le second
      // lien au destinataire pour qu'il puisse suivre et confirmer la
      // livraison de son côté.
      const senderMsg = `FIATLUX: Votre commande ${order.trackingNumber} est enregistrée. Suivez-la ici: ${baseUrl}/suivi/${senderToken}`;
      const recipientMsg = `FIATLUX: Un colis vous est destiné (Ref: ${order.trackingNumber}). Suivez la livraison: ${baseUrl}/suivi/${recipientToken}`;
      const smsJobs = [sendSms(senderPhone, senderMsg)];
      if (data.recipientPhone) {
        smsJobs.push(sendSms(data.recipientPhone, recipientMsg));
      }
      await Promise.all(smsJobs).catch(err => console.error("SMS Sending failed:", err)); // SMS failure shouldn't crash response
    }

    // 6. Réponse
    return NextResponse.json({
      trackingNumber: order.trackingNumber,
      orderId: order.id,
      senderToken,
      // Uniquement utile pour une livraison à un tiers — la page de
      // confirmation s'en sert pour proposer un lien "à partager" en
      // secours du SMS. Pour une livraison à soi-même, un seul lien
      // suffit et couvre déjà toute la course.
      recipientToken: deliveryType === 'THIRD_PARTY' ? recipientToken : null,
      deliveryType,
    });

  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Erreur lors de la création de la commande" }, { status: 500 });
  }
}