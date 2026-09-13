import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.ASSIGNED,
  OrderStatus.ACCEPTED,
  OrderStatus.EN_ROUTE_TO_PICKUP,
  OrderStatus.AT_PICKUP,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_TRANSIT,
  OrderStatus.AT_DROPOFF,
];

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, { role: 'rider' });

    const orders = await db.order.findMany({
      where: {
        riderId: auth.riderId,
        status: { in: ACTIVE_STATUSES },
      },
      include: {
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' }, // les plus anciennes en premier = les plus urgentes
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Rider orders error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
