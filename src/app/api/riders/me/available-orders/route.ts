import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { OrderStatus, ClaimStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, { role: 'rider' });

    const orders = await db.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        riderId: null,
      },
      select: {
        id: true,
        trackingNumber: true,
        pickupAddress: true,
        pickupZone: true,
        dropoffAddress: true,
        dropoffZone: true,
        packageDescription: true,
        amount: true,
        paymentMethod: true,
        createdAt: true,
        // Toutes les demandes de prise en charge sur cette commande — sert à
        // la fois à compter les chauffeurs intéressés et à savoir si CE
        // chauffeur a déjà demandé celle-ci. On évite `_count.select.claims`
        // (peut être désynchronisé du client Prisma généré selon quand
        // `prisma generate` a été relancé) en calculant tout en JS ci-dessous.
        claims: {
          select: { riderId: true, status: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Aplati pour le front : pas besoin de connaître la structure Prisma,
    // juste "est-ce que j'ai déjà demandé celle-ci ?".
    const withClaimState = orders.map((o: typeof orders[number]) => {
      const { claims, ...order } = o;
      const myClaim = claims.find((c) => c.riderId === auth.riderId);
      return {
        ...order,
        interestedRidersCount: claims.length,
        myClaimStatus: myClaim?.status ?? null,
      };
    });

    return NextResponse.json(withClaimState);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Available orders error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}