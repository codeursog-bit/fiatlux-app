import { NextRequest, NextResponse } from 'next/server';
import { resolveTrackingToken } from '@/lib/tracking-auth';
import { OrderStatus, TrackingRole } from '@prisma/client';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const result = await resolveTrackingToken(token);

    if (!result) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    const { order: rawOrder, role } = result;

    // Sanitize order data for public consumption
    const order = {
      id: rawOrder.id,
      trackingNumber: rawOrder.trackingNumber,
      status: rawOrder.status,
      // deliveryType (et pickupControlMode) manquaient ici : le frontend en
      // a besoin pour savoir qu'un même lien "à soi-même" doit pouvoir agir
      // comme expéditeur ET destinataire selon l'étape en cours. Sans ce
      // champ, order.deliveryType valait toujours undefined côté client,
      // quoi qu'on fasse côté React.
      deliveryType: rawOrder.deliveryType,
      pickupControlMode: rawOrder.pickupControlMode,
      pickupAddress: rawOrder.pickupAddress,
      pickupLat: rawOrder.pickupLat,
      pickupLng: rawOrder.pickupLng,
      dropoffAddress: rawOrder.dropoffAddress,
      dropoffLat: rawOrder.dropoffLat,
      dropoffLng: rawOrder.dropoffLng,
      routeGeoJson: rawOrder.routeGeoJson,
      recipientName: rawOrder.recipientName,
      // Mask recipient phone for sender, or vice versa if applicable
      recipientPhone: role === TrackingRole.RECIPIENT ? rawOrder.recipientPhone : maskPhone(rawOrder.recipientPhone),
      guestCustomerName: rawOrder.guestCustomerName,
      guestCustomerPhone: role === TrackingRole.SENDER ? rawOrder.guestCustomerPhone : maskPhone(rawOrder.guestCustomerPhone),
      packageDescription: rawOrder.packageDescription,
      amount: rawOrder.amount,
      paymentMethod: rawOrder.paymentMethod,
      paymentStatus: rawOrder.paymentStatus,
      cashPaymentSubtype: rawOrder.cashPaymentSubtype,
      rider: rawOrder.rider,
      statusHistory: rawOrder.statusHistory,
      gpsPings: rawOrder.gpsPings,
      createdAt: rawOrder.createdAt,
      riderRating: (rawOrder as any).riderRating,
      riderReview: (rawOrder as any).riderReview,
    };

    const confirmations = (rawOrder as any).confirmations || [];
    const isSelfDelivery = rawOrder.deliveryType === 'SELF';

    // Logique canConfirm
    // Pour une livraison à soi-même, le même lien doit pouvoir confirmer
    // aux DEUX étapes (successivement) — pas seulement celle correspondant
    // au rôle figé du lien.
    let canConfirm = false;
    if (isSelfDelivery) {
      canConfirm = order.status === OrderStatus.AT_PICKUP || order.status === OrderStatus.AT_DROPOFF;
    } else if (role === TrackingRole.SENDER && order.status === OrderStatus.AT_PICKUP) {
      canConfirm = true;
    } else if (role === TrackingRole.RECIPIENT && order.status === OrderStatus.AT_DROPOFF) {
      canConfirm = true;
    }

    // myActor/myPackageStep déterminent, pour CE lien, quelle confirmation
    // regarder dans l'historique. Pour une livraison à soi-même, ça doit
    // suivre l'étape ACTUELLE de la commande (AT_PICKUP -> PICKUP/SENDER,
    // AT_DROPOFF -> DROPOFF/RECIPIENT), sinon — comme observé ici — la
    // confirmation de remise (déjà faite) est prise à tort pour la
    // confirmation de réception, et le bouton "J'ai reçu le colis"
    // n'apparaît jamais après une remise déjà confirmée.
    const myActor = isSelfDelivery
      ? (order.status === OrderStatus.AT_DROPOFF ? 'RECIPIENT' : 'SENDER')
      : (role === TrackingRole.SENDER ? 'SENDER' : 'RECIPIENT');
    const myPackageStep = isSelfDelivery
      ? (order.status === OrderStatus.AT_DROPOFF ? 'DROPOFF' : 'PICKUP')
      : (role === TrackingRole.SENDER ? 'PICKUP' : 'DROPOFF');

    const alreadyConfirmedPackage = confirmations.some(
      (c: any) => c.actor === myActor && c.step === myPackageStep && c.action === 'CONFIRMED'
    );
    const alreadyConfirmedCash = confirmations.some(
      (c: any) => c.actor === myActor && c.step === 'CASH_PAYMENT' && c.action === 'CONFIRMED'
    );

    const openDispute = await db.dispute.findFirst({
      where: { orderId: order.id, status: 'OPEN' },
    });

    return NextResponse.json({
      order,
      role,
      canConfirm,
      alreadyConfirmedPackage,
      alreadyConfirmedCash,
      hasOpenDispute: !!openDispute,
    });
  } catch (error) {
    console.error('Tracking API error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

function maskPhone(phone: string | null) {
  if (!phone) return null;
  if (phone.length < 4) return "****";
  return phone.slice(0, 3) + "****" + phone.slice(-2);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { reason } = await req.json();
    
    const result = await resolveTrackingToken(token);
    if (!result) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    const { order, role } = result;

    if (role !== TrackingRole.SENDER) {
      return NextResponse.json({ error: 'Seul l\'expéditeur peut annuler la commande' }, { status: 403 });
    }

    if (order.status === OrderStatus.CANCELLED) {
      return NextResponse.json({ message: 'Commande déjà annulée' });
    }

    const nonCancellable: OrderStatus[] = [
      OrderStatus.PICKED_UP,
      OrderStatus.IN_TRANSIT,
      OrderStatus.AT_DROPOFF,
      OrderStatus.DELIVERED,
      OrderStatus.FAILED
    ];

    if (nonCancellable.includes(order.status)) {
      return NextResponse.json({ 
        error: 'L\'annulation n\'est plus possible à ce stade. Veuillez contacter le support.' 
      }, { status: 400 });
    }

    await db.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        statusHistory: {
          create: {
            status: OrderStatus.CANCELLED,
            note: reason || "Annulée par l'utilisateur via le portail de suivi"
          }
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tracking Cancel error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}