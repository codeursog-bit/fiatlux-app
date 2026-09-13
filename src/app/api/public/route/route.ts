import { NextRequest, NextResponse } from 'next/server';
import { getRoute } from '@/lib/routing';

/**
 * GET /api/public/route?pickupLat=&pickupLng=&dropoffLat=&dropoffLng=
 *
 * Calcule le trajet routier réel (OSRM) entre deux points, pour l'aperçu
 * en direct affiché pendant la saisie de commande (avant même la création
 * de la commande). Utilise la même fonction que la création de commande —
 * un seul endroit à faire évoluer si OSRM change un jour.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pickupLat = parseFloat(searchParams.get('pickupLat') || '');
  const pickupLng = parseFloat(searchParams.get('pickupLng') || '');
  const dropoffLat = parseFloat(searchParams.get('dropoffLat') || '');
  const dropoffLng = parseFloat(searchParams.get('dropoffLng') || '');

  if ([pickupLat, pickupLng, dropoffLat, dropoffLng].some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: 'Coordonnées requises' }, { status: 400 });
  }

  const route = await getRoute(pickupLat, pickupLng, dropoffLat, dropoffLng);

  if (!route) {
    // Jamais bloquant : le front retombe sur une ligne droite entre les
    // deux points si OSRM est indisponible.
    return NextResponse.json({ geoJson: null, distanceMeters: null, durationSeconds: null });
  }

  return NextResponse.json(route);
}
