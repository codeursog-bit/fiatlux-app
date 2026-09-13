import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Public, mais ne renvoie QUE les champs nécessaires à la page de
// paiement — jamais les téléphones ou adresses complètes d'un tiers.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        trackingNumber: true,
        amount: true,
        paymentMethod: true,
        paymentStatus: true,
        packageDescription: true,
        senderToken: true,
        recipientToken: true,
        deliveryType: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Public order by id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}