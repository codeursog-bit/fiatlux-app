import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { haversineDistanceMeters } from '@/lib/geo';

// Auto-partage de position du chauffeur (self-service) — distinct de
// /api/admin/riders/[id]/location qui nécessite un token admin. Le chauffeur
// n'a que son propre token rider ; utiliser la route admin ici renvoyait un
// 401 et déclenchait à tort une redirection vers le login admin général.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, { role: 'rider' });
    const riderId = auth.riderId!;

    const { lat, lng, speed, heading, orderId, address } = await req.json();

    if (lat === undefined || lng === undefined) {
      return errorResponse('Coordonnées lat/lng requises', 400);
    }

    const ping = await db.gpsPing.create({
      data: { riderId, orderId, lat, lng, speed, heading },
    });

    await db.rider.update({
      where: { id: riderId },
      data: { currentLat: lat, currentLng: lng, currentAddress: address },
    });

    const response: any = {
      pingId: ping.id,
      withinPickupZone: false,
      withinDropoffZone: false,
    };

    if (orderId) {
      const order = await db.order.findUnique({ where: { id: orderId } });
      if (order) {
        const distToPickup = haversineDistanceMeters(lat, lng, order.pickupLat, order.pickupLng);
        const distToDropoff = haversineDistanceMeters(lat, lng, order.dropoffLat, order.dropoffLng);
        if (distToPickup <= 100) response.withinPickupZone = true;
        if (distToDropoff <= 100) response.withinDropoffZone = true;
      }
    }

    return NextResponse.json(response);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Rider self-service location error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}