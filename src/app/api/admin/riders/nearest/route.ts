import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/lib/auth';
import { findNearestActiveRiders } from '@/lib/spatial';

/**
 * GET /api/admin/riders/nearest?lat=..&lng=..&radius=5000&limit=10
 *
 * Livreurs ACTIVE les plus proches d'un point (ex: le pickup d'une commande),
 * via l'index GiST PostGIS (voir prisma/postgis.sql + src/lib/spatial.ts).
 * Prêt pour un futur dispatch automatique ; pas encore branché à une action
 * dans l'UI admin.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, { role: 'admin' });

    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const radius = parseFloat(searchParams.get('radius') || '5000');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return errorResponse('Paramètres lat/lng requis', 400);
    }

    const riders = await findNearestActiveRiders(lat, lng, radius, limit);
    return NextResponse.json(riders);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    return errorResponse('Erreur serveur', 500);
  }
}
