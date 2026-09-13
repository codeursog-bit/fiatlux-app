import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';

// Fuseau Afrique/Brazzaville = UTC+1, sans heure d'été. On calcule les
// bornes "aujourd'hui / cette semaine / ce mois" sur ce décalage fixe
// plutôt que sur UTC brut, sinon les stats du jour se décalent d'une heure.
const TZ_OFFSET_HOURS = 1;

function startOfTodayUTC(): Date {
  const now = new Date();
  const localNow = new Date(now.getTime() + TZ_OFFSET_HOURS * 3600 * 1000);
  const localMidnight = new Date(Date.UTC(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate(),
    0, 0, 0
  ));
  return new Date(localMidnight.getTime() - TZ_OFFSET_HOURS * 3600 * 1000);
}

function startOfWeekUTC(): Date {
  const start = startOfTodayUTC();
  const localDay = new Date(start.getTime() + TZ_OFFSET_HOURS * 3600 * 1000).getUTCDay();
  // Semaine démarre le lundi (jour 1) ; dimanche (0) compte comme 7 jours après le dernier lundi
  const daysSinceMonday = (localDay + 6) % 7;
  return new Date(start.getTime() - daysSinceMonday * 24 * 3600 * 1000);
}

function startOfMonthUTC(): Date {
  const now = new Date();
  const localNow = new Date(now.getTime() + TZ_OFFSET_HOURS * 3600 * 1000);
  const localFirst = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), 1, 0, 0, 0));
  return new Date(localFirst.getTime() - TZ_OFFSET_HOURS * 3600 * 1000);
}

async function aggregateFor(riderId: string, since: Date) {
  const result = await db.order.aggregate({
    where: {
      riderId,
      status: OrderStatus.DELIVERED,
      updatedAt: { gte: since },
    },
    _count: { id: true },
    _sum: { amount: true },
  });

  return {
    deliveries: result._count.id,
    amount: result._sum.amount || 0,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, { role: 'rider' });
    const riderId = auth.riderId as string;

    const [today, week, month, rider, totalAllTime] = await Promise.all([
      aggregateFor(riderId, startOfTodayUTC()),
      aggregateFor(riderId, startOfWeekUTC()),
      aggregateFor(riderId, startOfMonthUTC()),
      db.rider.findUnique({ where: { id: riderId }, select: { rating: true } }),
      db.order.count({ where: { riderId, status: OrderStatus.DELIVERED } }),
    ]);

    return NextResponse.json({
      today,
      week,
      month,
      rating: rider?.rating ?? 5.0,
      totalDeliveriesAllTime: totalAllTime,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Rider stats error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
