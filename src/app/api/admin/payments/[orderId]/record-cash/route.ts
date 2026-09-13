import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { PaymentMethod, PaymentStatus, PaymentTransactionStatus } from '@prisma/client';

const CASH_METHODS: PaymentMethod[] = [PaymentMethod.CASH_AT_PICKUP, PaymentMethod.CASH_AT_DELIVERY];

// Permet à l'admin d'enregistrer manuellement un paiement en espèces reçu
// (ex: le client a payé le livreur en cash, ou un paiement rencontré hors
// plateforme) — utile pour que la comptabilité reflète la trésorerie réelle
// sans dépendre d'une confirmation automatique côté passerelle de paiement.
export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const auth = await requireAuth(req);
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER') {
      return errorResponse('Non autorisé', 403);
    }

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return errorResponse('Commande introuvable', 404);

    if (order.paymentStatus === PaymentStatus.PAID) {
      return errorResponse('Ce paiement est déjà marqué comme réglé', 409);
    }

    if (!CASH_METHODS.includes(order.paymentMethod)) {
      return errorResponse("Cette commande n'est pas réglée en espèces — impossible d'enregistrer un paiement cash", 400);
    }

    const [updatedOrder] = await db.$transaction([
      db.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.PAID },
      }),
      db.paymentTransaction.create({
        data: {
          orderId: order.id,
          method: order.paymentMethod,
          amount: order.amount,
          status: PaymentTransactionStatus.CONFIRMED,
          confirmedBySenderOrRecipient: true,
          externalReference: 'Saisie manuelle (admin)',
        },
      }),
    ]);

    return NextResponse.json({ order: updatedOrder });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Record cash payment error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}