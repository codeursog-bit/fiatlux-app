import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const method = searchParams.get('method') as PaymentMethod | null;
    const status = searchParams.get('status') as PaymentStatus | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (method) where.paymentMethod = method;
    if (status) where.paymentStatus = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        select: {
          id: true,
          trackingNumber: true,
          amount: true,
          paymentMethod: true,
          paymentStatus: true,
          createdAt: true,
          customer: { select: { name: true } },
          guestCustomerName: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Payments GET error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
