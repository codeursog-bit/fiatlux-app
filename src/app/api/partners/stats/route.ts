import { db } from "@/lib/db";
import { requireAuth, errorResponse } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, { role: 'partner' });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const stats = await db.order.aggregate({
      where: {
        partnerId: auth.partnerId,
        createdAt: { gte: startOfMonth }
      },
      _count: {
        id: true
      },
      _sum: {
        amount: true
      }
    });

    return NextResponse.json({
      orderCount: stats._count.id || 0,
      totalAmount: stats._sum.amount || 0,
      month: startOfMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
    });
    
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Partner stats GET error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
