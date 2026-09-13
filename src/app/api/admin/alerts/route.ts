import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { AlertType, Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as AlertType | null;
    const resolved = searchParams.get('resolved') === 'true';
    const riderId = searchParams.get('riderId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Prisma.AlertWhereInput = {
        resolved
    };

    if (type) where.type = type;
    if (riderId) where.riderId = riderId;

    const [alerts, total] = await Promise.all([
      db.alert.findMany({
        where,
        include: {
          rider: { select: { name: true } },
          order: { select: { trackingNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.alert.count({ where }),
    ]);

    return NextResponse.json({
      alerts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Alerts GET error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
