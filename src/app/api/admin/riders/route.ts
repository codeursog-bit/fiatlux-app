import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { RiderStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { normalizePhone } from '@/lib/phone';

const createRiderSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  vehiclePlate: z.string(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const q = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Prisma.RiderWhereInput = {};

    if (statusParam && statusParam !== 'ALL') where.status = statusParam as RiderStatus;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { vehiclePlate: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [riders, total] = await Promise.all([
      db.rider.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      db.rider.count({ where }),
    ]);

    const ridersWithLocation = riders.map((r) => ({
      ...r,
      currentLocation: r.currentLat != null && r.currentLng != null
        ? { lat: r.currentLat, lng: r.currentLng, address: r.currentAddress || '' }
        : undefined,
    }));

    return NextResponse.json({
      riders: ridersWithLocation,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Riders GET error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER') {
      return errorResponse('Seuls les administrateurs peuvent ajouter des livreurs', 403);
    }

    const body = await req.json();
    const result = createRiderSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Données invalides', 400);
    }

    const rider = await db.rider.create({
      data: {
        ...result.data,
        phone: normalizePhone(result.data.phone),
        status: RiderStatus.INACTIVE,
      },
    });

    return NextResponse.json(rider, { status: 201 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    if (error.code === 'P2002') return errorResponse('Un livreur avec ce numéro de téléphone existe déjà', 409);
    console.error('Riders POST error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}