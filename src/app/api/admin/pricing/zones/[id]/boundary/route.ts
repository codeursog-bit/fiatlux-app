import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';

/**
 * PATCH /api/admin/pricing/zones/[id]/boundary
 * Body: { points: [{ lat, lng }, ...] }  (au moins 3 points, non fermé —
 * on referme le polygone nous-mêmes)
 *
 * PricingZone.boundary est un type PostGIS (Unsupported côté Prisma Client) :
 * invisible du client généré, on doit passer par du SQL brut pour l'écrire.
 * Le reste de la zone (zoneName, etc.) continue de passer par Prisma normalement.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(req, { role: 'admin' });
    const { id } = await params;
    const { points } = await req.json();

    if (!Array.isArray(points) || points.length < 3) {
      return errorResponse('Un contour de zone nécessite au moins 3 points', 400);
    }

    const zone = await db.pricingZone.findUnique({ where: { id } });
    if (!zone) return errorResponse('Zone introuvable', 404);

    // GeoJSON Polygon : anneau fermé (premier point == dernier point),
    // coordonnées en [lng, lat] (convention GeoJSON, pas [lat, lng]).
    const ring = points.map((p: { lat: number; lng: number }) => [p.lng, p.lat]);
    ring.push(ring[0]);
    const geoJson = JSON.stringify({ type: 'Polygon', coordinates: [ring] });

    await db.$executeRaw`
      UPDATE "PricingZone"
      SET boundary = ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), 4326)::geography
      WHERE id = ${id};
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Zone boundary update error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}

/**
 * DELETE /api/admin/pricing/zones/[id]/boundary — efface le contour dessiné
 * (garde la zone elle-même, juste le polygone).
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(req, { role: 'admin' });
    const { id } = await params;
    await db.$executeRaw`UPDATE "PricingZone" SET boundary = NULL WHERE id = ${id};`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    return errorResponse('Erreur serveur', 500);
  }
}
