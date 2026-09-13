import { NextRequest, NextResponse } from 'next/server';
import { findNearbyLandmarks } from '@/lib/spatial';

/**
 * GET /api/public/landmarks/nearby?lat=&lng=&radius=1500
 *
 * Suggère les repères connus les plus proches d'une position GPS — utilisé
 * quand la personne clique "Ma position" au lieu de taper un nom, pour lui
 * proposer un lieu connu plutôt que de forcer un point brut sans contexte.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const radius = parseFloat(searchParams.get('radius') || '1500');

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'lat/lng requis' }, { status: 400 });
  }

  try {
    const landmarks = await findNearbyLandmarks(lat, lng, radius, 5);
    return NextResponse.json(landmarks);
  } catch (error) {
    console.error('Nearby landmarks error:', error);
    return NextResponse.json([]);
  }
}
