import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, { role: 'admin' });

    const { searchParams } = new URL(req.url);
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '30', 10)));

    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    // Toutes les commandes créées sur la période, récupérées une seule
    // fois et agrégées en mémoire par jour — plus simple et suffisant
    // à ce volume qu'une groupBy SQL par date tronquée.
    const orders = await db.order.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true, amount: true, riderId: true },
    });

    const dailyMap = new Map<string, { deliveries: number; revenue: number; cancelled: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      dailyMap.set(d.toISOString().slice(0, 10), { deliveries: 0, revenue: 0, cancelled: 0 });
    }

    const statusCounts: Record<string, number> = {};

    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      const bucket = dailyMap.get(key);
      if (bucket) {
        if (order.status === OrderStatus.DELIVERED) {
          bucket.deliveries += 1;
          bucket.revenue += order.amount;
        }
        if (order.status === OrderStatus.CANCELLED) {
          bucket.cancelled += 1;
        }
      }
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    }

    const dailyData = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }));

    const statusData = [
      { name: 'Livrées', key: 'DELIVERED', value: statusCounts.DELIVERED || 0, color: '#10b981' },
      { name: 'En cours', key: 'IN_PROGRESS', value: orders.filter(o => !['DELIVERED', 'CANCELLED', 'FAILED', 'PENDING'].includes(o.status)).length, color: '#3b82f6' },
      { name: 'Annulées', key: 'CANCELLED', value: statusCounts.CANCELLED || 0, color: '#ef4444' },
      { name: 'Échecs', key: 'FAILED', value: statusCounts.FAILED || 0, color: '#f59e0b' },
    ];

    // Performance chauffeur réelle sur la période
    const riderPerf = await db.order.groupBy({
      by: ['riderId'],
      where: { createdAt: { gte: since }, status: OrderStatus.DELIVERED, riderId: { not: null } },
      _count: { id: true },
    });

    const riderIds = riderPerf.map((r) => r.riderId).filter((id): id is string => !!id);
    const riders = riderIds.length
      ? await db.rider.findMany({ where: { id: { in: riderIds } }, select: { id: true, name: true, rating: true } })
      : [];

    const riderPerformance = riderPerf
      .map((r) => {
        const rider = riders.find((x) => x.id === r.riderId);
        return { name: rider?.name || 'Inconnu', deliveries: r._count.id, rating: rider?.rating ?? 5 };
      })
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 5);

    const totalRevenue = dailyData.reduce((acc, d) => acc + d.revenue, 0);
    const totalDeliveries = dailyData.reduce((acc, d) => acc + d.deliveries, 0);

    return NextResponse.json({
      dailyData,
      statusData,
      riderPerformance,
      summary: {
        totalRevenue,
        totalDeliveries,
        totalOrders: orders.length,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Reports error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
