import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { OrderStatus, RiderStatus } from '@prisma/client';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

// Statuts "en cours" (après prise en charge, avant remise) — utilisé pour
// regrouper la répartition par statut affichée en camembert sur le dashboard.
const IN_PROGRESS_STATUSES: OrderStatus[] = [
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
    await requireAuth(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [
      totalDeliveries,
      activeRiders,
      pendingDeliveries,
      completedToday,
      completedYesterday,
      activeAlerts,
      ratingAgg,
      statusGroups,
      todayOrders,
      deliveredHistory7d,
      deliveredCount30d,
      cancelledCount30d,
      pickupHistory30d,
      topRidersGroup,
    ] = await Promise.all([
      db.order.count(),
      db.rider.count({ where: { status: RiderStatus.ACTIVE } }),
      db.order.count({ where: { status: OrderStatus.PENDING } }),
      db.order.count({
        where: { status: OrderStatus.DELIVERED, createdAt: { gte: today } },
      }),
      db.order.count({
        where: { status: OrderStatus.DELIVERED, createdAt: { gte: yesterday, lt: today } },
      }),
      db.alert.count({ where: { resolved: false } }),
      db.order.aggregate({
        where: { riderRating: { not: null } },
        _avg: { riderRating: true },
        _count: { riderRating: true },
      }),
      db.order.groupBy({ by: ['status'], _count: { _all: true } }),
      db.order.findMany({
        where: { createdAt: { gte: today } },
        select: { createdAt: true },
      }),
      db.orderStatusHistory.findMany({
        where: { status: OrderStatus.DELIVERED, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, order: { select: { amount: true } } },
      }),
      db.order.count({ where: { status: OrderStatus.DELIVERED, createdAt: { gte: thirtyDaysAgo } } }),
      db.order.count({
        where: { status: { in: [OrderStatus.CANCELLED, OrderStatus.FAILED] }, createdAt: { gte: thirtyDaysAgo } },
      }),
      db.orderStatusHistory.findMany({
        where: {
          status: { in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP] },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { orderId: true, status: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      db.order.groupBy({
        by: ['riderId'],
        where: { status: OrderStatus.DELIVERED, createdAt: { gte: sevenDaysAgo }, riderId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { riderId: 'desc' } },
        take: 5,
      }),
    ]);

    // Répartition horaire des commandes du jour (08h–20h).
    const hourlyBuckets: Record<string, number> = {};
    for (let h = 8; h <= 20; h++) hourlyBuckets[`${String(h).padStart(2, '0')}:00`] = 0;
    for (const o of todayOrders) {
      const h = o.createdAt.getHours();
      const key = `${String(h).padStart(2, '0')}:00`;
      if (key in hourlyBuckets) hourlyBuckets[key] += 1;
    }
    const hourlyBreakdown = Object.entries(hourlyBuckets).map(([hour, orders]) => ({ hour, orders }));

    // Revenus des 7 derniers jours (commandes réellement livrées).
    const revenueByDay = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      revenueByDay.set(d.toDateString(), 0);
    }
    for (const h of deliveredHistory7d) {
      const key = h.createdAt.toDateString();
      if (revenueByDay.has(key)) {
        revenueByDay.set(key, (revenueByDay.get(key) || 0) + (h.order?.amount || 0));
      }
    }
    const weeklyRevenue = Array.from(revenueByDay.entries()).map(([dateStr, total]) => ({
      name: DAY_LABELS[new Date(dateStr).getDay()],
      total: Math.round(total),
    }));

    // Répartition par statut (regroupée en 4 catégories pour le camembert).
    const statusCountMap: Record<string, number> = {};
    for (const g of statusGroups) statusCountMap[g.status] = g._count._all;
    const statusDistribution = [
      { name: 'En attente', value: statusCountMap[OrderStatus.PENDING] || 0, color: '#f59e0b' },
      {
        name: 'En cours',
        value: IN_PROGRESS_STATUSES.reduce((sum, s) => sum + (statusCountMap[s] || 0), 0),
        color: '#2563eb',
      },
      { name: 'Livré', value: statusCountMap[OrderStatus.DELIVERED] || 0, color: '#10b981' },
      {
        name: 'Annulé',
        value: (statusCountMap[OrderStatus.CANCELLED] || 0) + (statusCountMap[OrderStatus.FAILED] || 0),
        color: '#ef4444',
      },
    ];

    // Temps moyen de prise en charge (ASSIGNED → PICKED_UP), 30 derniers jours.
    const assignedAt = new Map<string, Date>();
    const pickupDurationsMin: number[] = [];
    for (const h of pickupHistory30d) {
      if (h.status === OrderStatus.ASSIGNED) {
        assignedAt.set(h.orderId, h.createdAt);
      } else if (h.status === OrderStatus.PICKED_UP) {
        const start = assignedAt.get(h.orderId);
        if (start) {
          pickupDurationsMin.push((h.createdAt.getTime() - start.getTime()) / 60000);
          assignedAt.delete(h.orderId);
        }
      }
    }
    const avgPickupMinutes = pickupDurationsMin.length
      ? pickupDurationsMin.reduce((a, b) => a + b, 0) / pickupDurationsMin.length
      : null;

    const completionRate =
      deliveredCount30d + cancelledCount30d > 0
        ? (deliveredCount30d / (deliveredCount30d + cancelledCount30d)) * 100
        : null;

    // Variation vs hier, uniquement affichée si hier avait déjà des données
    // (sinon un "+∞%" ou une variation depuis 0 n'a pas de sens à montrer).
    const completedTodayTrend =
      completedYesterday > 0 ? ((completedToday - completedYesterday) / completedYesterday) * 100 : null;

    // Résout les noms/notes des livreurs en tête de classement (7 derniers jours).
    const topRiderIds = topRidersGroup.map((g) => g.riderId).filter((id): id is string => !!id);
    const topRidersInfo = topRiderIds.length
      ? await db.rider.findMany({
          where: { id: { in: topRiderIds } },
          select: { id: true, name: true, rating: true },
        })
      : [];
    const topRiders = topRidersGroup
      .filter((g) => g.riderId)
      .map((g) => {
        const info = topRidersInfo.find((r) => r.id === g.riderId);
        return { id: g.riderId as string, name: info?.name || 'Livreur', rating: info?.rating ?? null, deliveries: g._count._all };
      });

    return NextResponse.json({
      totalDeliveries,
      activeRiders,
      pendingDeliveries,
      completedToday,
      activeAlerts,
      avgRating: ratingAgg._avg.riderRating,
      ratingsCount: ratingAgg._count.riderRating,
      hourlyBreakdown,
      weeklyRevenue,
      statusDistribution,
      avgPickupMinutes,
      completionRate,
      completedTodayTrend,
      deliveredCount30d,
      cancelledCount30d,
      topRiders,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Dashboard stats error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}