import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, { role: 'admin' });
    const zones = await db.pricingZone.findMany({
      orderBy: { zoneName: 'asc' },
    });

    // boundary est un type PostGIS invisible du client Prisma (Unsupported) —
    // on le récupère à part en SQL brut et on le fusionne avec les zones.
    const boundaries = await db.$queryRaw<{ id: string; geoJson: string | null }[]>`
      SELECT id, ST_AsGeoJSON(boundary) as "geoJson" FROM "PricingZone";
    `;
    const boundaryMap = new Map(boundaries.map((b: { id: string; geoJson: string | null }) => [b.id, b.geoJson ? JSON.parse(b.geoJson) : null]));

    const zonesWithBoundary = zones.map((z: typeof zones[number]) => ({ ...z, boundary: boundaryMap.get(z.id) ?? null }));

    return NextResponse.json(zonesWithBoundary);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req, { role: 'admin' });
    const { zoneName } = await req.json();

    if (!zoneName) return errorResponse('Nom de zone requis', 400);

    const zone = await db.pricingZone.create({
      data: { zoneName },
    });

    return NextResponse.json(zone);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    if (error.code === 'P2002') return errorResponse('Cette zone existe déjà', 409);
    return errorResponse('Erreur serveur', 500);
  }
}
