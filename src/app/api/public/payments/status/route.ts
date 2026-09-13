import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getMotekiOrderStatus } from '@/lib/moteki';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json({ error: 'ID de paiement requis' }, { status: 400 });
    }

    // On cible TOUJOURS cette transaction précise (jamais "une commande
    // au hasard") — critique quand plusieurs clients paient en même temps.
    const transaction = await db.paymentTransaction.findUnique({
      where: { id: paymentId },
      include: { order: { select: { trackingNumber: true, paymentStatus: true } } },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 });
    }

    if (transaction.status === 'CONFIRMED') {
      return NextResponse.json({ status: 'SUCCESS', trackingNumber: transaction.order.trackingNumber });
    }

    if (transaction.status === 'FAILED') {
      return NextResponse.json({ status: 'FAILED' });
    }

    if (!transaction.externalReference) {
      // Ne devrait pas arriver (toujours défini à l'initiation), mais on
      // ne casse pas le polling pour autant.
      return NextResponse.json({ status: 'PENDING' });
    }

    const motekiStatus = await getMotekiOrderStatus(transaction.externalReference);

    if (motekiStatus.paymentStatus === 'paid') {
      await db.$transaction(async (tx) => {
        // Revérifie encore PENDING à l'intérieur de la transaction pour
        // éviter un double traitement si deux requêtes de polling arrivent
        // en même temps.
        const current = await tx.paymentTransaction.findUnique({ where: { id: paymentId } });
        if (!current || current.status !== 'PENDING') return;

        await tx.paymentTransaction.update({ where: { id: paymentId }, data: { status: 'CONFIRMED' } });
        await tx.order.update({ where: { id: transaction.orderId }, data: { paymentStatus: 'PAID' } });
      });

      return NextResponse.json({ status: 'SUCCESS', trackingNumber: transaction.order.trackingNumber });
    }

    if (motekiStatus.paymentStatus === 'failed') {
      await db.paymentTransaction.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
      return NextResponse.json({ status: 'FAILED' });
    }

    return NextResponse.json({ status: 'PENDING' });
  } catch (error) {
    console.error('Payment status error:', error);
    // Une erreur réseau vers Moteki ne doit pas faire échouer le
    // paiement côté client — on répond PENDING pour laisser le polling
    // réessayer, plutôt que de casser le flow sur un souci transitoire.
    return NextResponse.json({ status: 'PENDING' });
  }
}
