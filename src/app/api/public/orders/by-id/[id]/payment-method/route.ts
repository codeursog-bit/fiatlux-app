import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Route publique (utilisée depuis la page de paiement client, avant
 * toute authentification) permettant UNIQUEMENT de basculer une
 * commande d'un paiement en ligne échoué vers un paiement en espèces.
 * Volontairement restrictive : on n'autorise pas n'importe quel
 * changement de paymentMethod depuis une route non protégée.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { cashPaymentSubtype } = await req.json();

    const order = await db.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    if (order.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'Cette commande est déjà payée' }, { status: 409 });
    }

    if (!order.paymentMethod.startsWith('ONLINE')) {
      return NextResponse.json({ error: "Cette commande n'est pas en paiement en ligne" }, { status: 409 });
    }

    const subtype = cashPaymentSubtype === 'RECIPIENT_PAYS' ? 'RECIPIENT_PAYS' : 'SENDER_PAYS';
    const method = subtype === 'RECIPIENT_PAYS' ? 'CASH_AT_DELIVERY' : 'CASH_AT_PICKUP';

    const updated = await db.order.update({
      where: { id },
      data: { paymentMethod: method, cashPaymentSubtype: subtype },
    });

    // Prépare la transaction espèces qui sera confirmée plus tard via la
    // double confirmation (payeur puis chauffeur) sur /suivi/[token].
    const existingTx = await db.paymentTransaction.findFirst({ where: { orderId: id } });
    if (!existingTx) {
      await db.paymentTransaction.create({
        data: { orderId: id, method, amount: order.amount, status: 'PENDING' },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Switch to cash error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
