import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const CASH_METHODS: PaymentMethod[] = [PaymentMethod.CASH_AT_PICKUP, PaymentMethod.CASH_AT_DELIVERY];

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [todayPaid, pending, pendingCount, overdue, methods, weekPaidOrders] = await Promise.all([
      db.order.aggregate({
        where: { paymentStatus: PaymentStatus.PAID, createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      db.order.aggregate({
        where: { paymentStatus: PaymentStatus.PENDING },
        _sum: { amount: true },
      }),
      db.order.count({ where: { paymentStatus: PaymentStatus.PENDING } }),
      db.order.aggregate({
        where: { paymentStatus: PaymentStatus.FAILED },
        _sum: { amount: true },
      }),
      db.order.groupBy({
        by: ['paymentMethod'],
        where: { paymentStatus: PaymentStatus.PAID },
        _sum: { amount: true },
      }),
      db.order.findMany({
        where: { paymentStatus: PaymentStatus.PAID, createdAt: { gte: sevenDaysAgo } },
        select: { amount: true, paymentMethod: true, createdAt: true },
      }),
    ]);

    const cashTotal =
      (methods.find(m => m.paymentMethod === PaymentMethod.CASH_AT_PICKUP)?._sum.amount || 0) +
      (methods.find(m => m.paymentMethod === PaymentMethod.CASH_AT_DELIVERY)?._sum.amount || 0);
    const platformTotal =
      (methods.find(m => m.paymentMethod === PaymentMethod.ONLINE)?._sum.amount || 0) +
      (methods.find(m => m.paymentMethod === PaymentMethod.ONLINE_MTN)?._sum.amount || 0) +
      (methods.find(m => m.paymentMethod === PaymentMethod.ONLINE_AIRTEL)?._sum.amount || 0);
    const grandTotal = cashTotal + platformTotal;

    // Répartition plateforme / espèces des 7 derniers jours, jour par jour.
    const byDay = new Map<string, { platform: number; cash: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      byDay.set(d.toDateString(), { platform: 0, cash: 0 });
    }
    for (const o of weekPaidOrders) {
      const key = o.createdAt.toDateString();
      const bucket = byDay.get(key);
      if (!bucket) continue;
      if (CASH_METHODS.includes(o.paymentMethod)) bucket.cash += o.amount;
      else bucket.platform += o.amount;
    }
    const weeklyByMethod = Array.from(byDay.entries()).map(([dateStr, v]) => ({
      name: DAY_LABELS[new Date(dateStr).getDay()],
      platform: Math.round(v.platform),
      cash: Math.round(v.cash),
    }));

    const summary = {
      todayCollected: todayPaid._sum.amount || 0,
      totalPending: pending._sum.amount || 0,
      pendingCount,
      overdueAmount: overdue._sum.amount || 0,
      platformPercentage: grandTotal > 0 ? Math.round((platformTotal / grandTotal) * 100) : 0,
      cashPercentage: grandTotal > 0 ? Math.round((cashTotal / grandTotal) * 100) : 0,
      weeklyByMethod,
      byMethod: { CASH: cashTotal, ONLINE: platformTotal },
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Payments summary GET error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}