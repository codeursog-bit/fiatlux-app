import { NextRequest, NextResponse } from 'next/server';
import { resolveTrackingToken } from '@/lib/tracking-auth';
import { OrderStatus, TrackingRole } from '@prisma/client';
import { db } from '@/lib/db';
import { isRateLimited } from '@/lib/rate-limit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    if (isRateLimited(`rate-${token}`, 5, 60000)) {
      return NextResponse.json({ error: 'Trop de tentatives. Veuillez patienter.' }, { status: 429 });
    }

    const { rating, review } = await req.json();
    
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'La note doit être comprise entre 1 et 5.' }, { status: 400 });
    }

    const result = await resolveTrackingToken(token);
    if (!result) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    const { order: rawOrder, role } = result;
    const order = rawOrder as any;

    // Livraison "à soi-même" : le seul lien existant est enregistré avec le
    // rôle SENDER par convention, mais cette même personne doit pouvoir
    // noter le livreur comme n'importe quel destinataire — voir la même
    // logique déjà appliquée pour la confirmation de réception plus haut
    // dans la route /confirm.
    const isSelfDelivery = order.deliveryType === 'SELF';

    if (!isSelfDelivery && role !== TrackingRole.RECIPIENT) {
      return NextResponse.json({ error: 'Seul le destinataire peut noter le livreur.' }, { status: 403 });
    }

    if (order.status !== OrderStatus.DELIVERED) {
      return NextResponse.json({ error: 'Vous ne pouvez noter le livreur qu\'après la livraison.' }, { status: 400 });
    }

    if (order.riderRating) {
      return NextResponse.json({ error: 'Vous avez déjà noté cette commande.' }, { status: 400 });
    }

    if (!order.riderId) {
      return NextResponse.json({ error: 'Aucun livreur associé à cette commande.' }, { status: 400 });
    }

    // Update order with rating and review, and update rider average rating in a transaction
    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          riderRating: rating,
          riderReview: review,
        }
      });

      const allRiderRatings = await tx.order.findMany({
        where: {
          riderId: order.riderId,
          riderRating: { not: null }
        },
        select: {
          riderRating: true
        }
      });

      if (allRiderRatings.length > 0) {
        const sum = allRiderRatings.reduce((acc, curr) => acc + (curr.riderRating || 0), 0);
        const average = sum / allRiderRatings.length;

        await tx.rider.update({
          where: { id: order.riderId },
          data: {
            rating: average
          }
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rating update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}