import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { VehicleStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req);
    const { id } = await params;

    const vehicle = await db.vehicle.findUnique({
      where: { id },
      include: {
        rider: true,
      },
    });

    if (!vehicle) {
      return errorResponse('Véhicule non trouvé', 404);
    }

    return NextResponse.json(vehicle);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER') {
      return errorResponse('Non autorisé', 403);
    }

    const { id } = await params;
    const body = await req.json();

    const updatedVehicle = await db.vehicle.update({
      where: { id },
      data: {
        plate: body.plate,
        model: body.model,
        mileage: body.mileage,
        status: body.status as VehicleStatus,
        riderId: body.riderId, // Can be null to unassign
      },
    });

    return NextResponse.json(updatedVehicle);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Vehicle PATCH error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
