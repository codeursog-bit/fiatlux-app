import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { haversineDistanceMeters } from '@/lib/geo';
import { AlertType, RiderStatus } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id: riderId } = await params;

    // Verify it's the rider themselves or a dispatcher/admin
    if (auth.id !== riderId && auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER') {
      return errorResponse('Non autorisé', 403);
    }

    const { lat, lng, speed, heading, orderId, address } = await req.json();

    if (lat === undefined || lng === undefined) {
      return errorResponse('Coordonnées lat/lng requises', 400);
    }

    // 1. Create GpsPing
    const ping = await db.gpsPing.create({
      data: {
        riderId,
        orderId,
        lat,
        lng,
        speed,
        heading,
      },
    });

    // 2. Update Rider current position
    await db.rider.update({
      where: { id: riderId },
      data: {
        currentLat: lat,
        currentLng: lng,
        currentAddress: address,
      },
    });

    const response: any = {
      pingId: ping.id,
      withinPickupZone: false,
      withinDropoffZone: false,
    };

    // 3. Zone checking if orderId is provided
    if (orderId) {
      const order = await db.order.findUnique({ where: { id: orderId } });
      if (order) {
        const distToPickup = haversineDistanceMeters(lat, lng, order.pickupLat, order.pickupLng);
        const distToDropoff = haversineDistanceMeters(lat, lng, order.dropoffLat, order.dropoffLng);

        if (distToPickup <= 100) response.withinPickupZone = true;
        if (distToDropoff <= 100) response.withinDropoffZone = true;
      }
    }

    // 4. Basic Alert Detection (Simplified for Next.js)
    // STALL: Checked against last status change in reality, 
    // but here we can check the rider's status and last ping.
    const rider = await db.rider.findUnique({ 
        where: { id: riderId },
        include: { 
            alerts: { where: { resolved: false, type: AlertType.STALL }, take: 1 }
        }
    });

    // OFFLINE check would normally be a background task. 
    // Here we can flag it if the ping gap is detected during the NEXT ping, 
    // or rely on the dispatcher dashboard to show "Offline" if last ping > 5m.

    // DEVIATION: V2 - not implemented for MVP.

    return NextResponse.json(response);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Location update error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
