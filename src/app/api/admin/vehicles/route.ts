import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { VehicleStatus, Prisma } from '@prisma/client';
import { z } from 'zod';

const createVehicleSchema = z.object({
  plate: z.string().min(3),
  model: z.string().min(2),
  mileage: z.number().optional(),
  status: z.nativeEnum(VehicleStatus).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as VehicleStatus | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {};
    if (status) where.status = status;

    const [vehicles, total] = await Promise.all([
      db.vehicle.findMany({
        where,
        include: {
          rider: { select: { id: true, name: true } },
        },
        orderBy: { plate: 'asc' },
        skip,
        take: limit,
      }),
      db.vehicle.count({ where }),
    ]);

    return NextResponse.json({
      vehicles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER') {
      return errorResponse('Non autorisé', 403);
    }

    const body = await req.json();
    const result = createVehicleSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Données invalides', 400);
    }

    const vehicle = await db.vehicle.create({
      data: result.data,
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    if (error.code === 'P2002') return errorResponse('Un véhicule avec cette plaque existe déjà', 409);
    return errorResponse('Erreur serveur', 500);
  }
}
