import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { OrderStatus, Prisma, TrackingRole, DeliveryType, PickupControlMode } from '@prisma/client';
import { z } from 'zod';
import { sendSms } from '@/lib/sms';
import { normalizePhone } from '@/lib/phone';
import crypto from 'crypto';

const createOrderSchema = z.object({
  customerId: z.string().optional(),
  guestCustomerName: z.string().optional(),
  guestCustomerPhone: z.string().optional(),
  pickupAddress: z.string(),
  pickupLat: z.number(),
  pickupLng: z.number(),
  dropoffAddress: z.string(),
  dropoffLat: z.number(),
  dropoffLng: z.number(),
  recipientName: z.string(),
  recipientPhone: z.string(),
  packageDescription: z.string(),
  amount: z.number(),
  quotedManually: z.boolean().optional(),
  paymentMethod: z.enum(['ONLINE', 'ONLINE_MTN', 'ONLINE_AIRTEL', 'CASH_AT_PICKUP', 'CASH_AT_DELIVERY']),
  // Même logique que /api/public/orders : une commande "Moi-même" saisie
  // par un dispatcher doit se comporter exactement comme une commande
  // passée directement par le client — sinon le blocage GPS + saut de
  // confirmation expéditeur qu'on a construit pour ce cas ne s'applique
  // jamais aux commandes créées manuellement.
  deliveryType: z.enum(['SELF', 'THIRD_PARTY']).optional(),
  pickupControlMode: z.enum(['AUTO', 'MANUAL']).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as OrderStatus | null;
    const riderId = searchParams.get('riderId');
    const q = searchParams.get('q');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (status) where.status = status;
    if (riderId) where.riderId = riderId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    if (q) {
      where.OR = [
        { trackingNumber: { contains: q, mode: 'insensitive' } },
        { recipientName: { contains: q, mode: 'insensitive' } },
        { guestCustomerName: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          rider: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Orders GET error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER') {
      return errorResponse('Seuls les dispatchers peuvent créer des commandes', 403);
    }

    const body = await req.json();
    const result = createOrderSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Données invalides', 400);
    }

    const { customerId, ...rest } = result.data;

    if (rest.deliveryType === 'SELF' && !rest.pickupControlMode) {
      return errorResponse('Précisez le mode de collecte (laisser la main ou garder le contrôle)', 400);
    }

    // Generate tracking number EXP-TIMESTAMP-RANDOM
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    const trackingNumber = `EXP-${timestamp}-${random}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const senderToken = crypto.randomUUID();
    const recipientToken = crypto.randomUUID();

    const order = await db.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          ...rest,
          deliveryType: (rest.deliveryType as DeliveryType) || DeliveryType.THIRD_PARTY,
          pickupControlMode: (rest.pickupControlMode as PickupControlMode) || null,
          customerId: customerId || undefined,
          trackingNumber,
          status: OrderStatus.PENDING,
          senderToken,
          recipientToken,
          statusHistory: {
            create: {
              status: OrderStatus.PENDING,
              note: 'Commande créée par le dispatcher',
            },
          },
        },
      });

      // Mêmes liens de suivi (et donc même possibilité de double
      // confirmation) qu'une commande passée par le client lui-même —
      // le canal de saisie (dispatcher vs formulaire public) ne doit
      // rien changer côté suivi.
      await tx.trackingLink.createMany({
        data: [
          {
            orderId: newOrder.id,
            token: senderToken,
            role: TrackingRole.SENDER,
            phone: normalizePhone(rest.guestCustomerPhone || ''),
            expiresAt,
          },
          {
            orderId: newOrder.id,
            token: recipientToken,
            role: TrackingRole.RECIPIENT,
            phone: normalizePhone(rest.recipientPhone),
            expiresAt,
          },
        ],
      });

      return newOrder;
    });

    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://fiatlux.cg';
    const senderMsg = `FIATLUX: Votre commande ${order.trackingNumber} est enregistrée. Suivez-la ici: ${baseUrl}/suivi/${senderToken}`;
    const recipientMsg = `FIATLUX: Un colis vous est destiné (Ref: ${order.trackingNumber}). Suivez la livraison: ${baseUrl}/suivi/${recipientToken}`;
    // Livraison "pour soi-même" (même numéro expéditeur/destinataire) : un
    // seul SMS pour ne pas doubler le coût, mais avec LES DEUX liens. Sans
    // ça, la personne ne recevait jamais le lien "destinataire" — or c'est
    // ce lien précis qui permet de confirmer la réception du colis. Sans
    // confirmation, le chauffeur reste bloqué à "Livré" indéfiniment et le
    // client voit "en attente" alors même qu'il est arrivé à destination.
    const selfDeliveryMsg = `FIATLUX: Commande ${order.trackingNumber} enregistrée. Suivi: ${baseUrl}/suivi/${senderToken}\nÀ utiliser à la livraison pour confirmer réception: ${baseUrl}/suivi/${recipientToken}`;

    const isSelfDelivery = rest.deliveryType === 'SELF' || (!!rest.recipientPhone && rest.recipientPhone === rest.guestCustomerPhone);

    await Promise.all([
      isSelfDelivery && rest.guestCustomerPhone
        ? sendSms(rest.guestCustomerPhone, selfDeliveryMsg)
        : Promise.all([
            rest.guestCustomerPhone ? sendSms(rest.guestCustomerPhone, senderMsg) : Promise.resolve(),
            rest.recipientPhone ? sendSms(rest.recipientPhone, recipientMsg) : Promise.resolve(),
          ]),
    ]).catch((err) => console.error('SMS Sending failed:', err)); // ne doit jamais faire échouer la réponse

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Orders POST error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}