import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { RiderStatus, OrderStatus } from '@prisma/client';
import { normalizePhone } from '@/lib/phone';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req);
    const { id } = await params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [rider, deliveriesToday, deliveriesMonth] = await Promise.all([
      db.rider.findUnique({
        where: { id },
        include: {
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              customer: { select: { name: true } }
            }
          },
          alerts: {
            where: { resolved: false },
            orderBy: { createdAt: 'desc' }
          },
          vehicles: true
        }
      }),
      db.order.count({ where: { riderId: id, status: OrderStatus.DELIVERED, createdAt: { gte: today } } }),
      db.order.count({ where: { riderId: id, status: OrderStatus.DELIVERED, createdAt: { gte: monthStart } } }),
    ]);

    if (!rider) {
      return errorResponse('Livreur non trouvé', 404);
    }

    const riderWithLocation = {
      ...rider,
      currentLocation: rider.currentLat != null && rider.currentLng != null
        ? { lat: rider.currentLat, lng: rider.currentLng, address: rider.currentAddress || '' }
        : undefined,
      deliveriesToday,
      deliveriesMonth,
    };

    return NextResponse.json(riderWithLocation);
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
    const { id } = await params;
    const body = await req.json();

    const rider = await db.rider.findUnique({ where: { id } });
    if (!rider) return errorResponse('Livreur non trouvé', 404);

    // Permission check: admin/dispatcher or the rider themselves
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER' && auth.id !== id) {
      return errorResponse('Non autorisé', 403);
    }

    const updatedRider = await db.rider.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone ? normalizePhone(body.phone) : undefined,
        vehiclePlate: body.vehiclePlate,
        status: body.status as RiderStatus,
        currentAddress: body.currentAddress,
      },
    });

    return NextResponse.json(updatedRider);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Rider PATCH error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}