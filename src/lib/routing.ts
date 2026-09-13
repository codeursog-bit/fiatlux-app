/**
 * Calcul de trajet routier via OSRM.
 *
 * ⚠️ Utilise le serveur de démonstration public (router.project-osrm.org)
 * — pas fait pour la production : limites de débit, pas de garantie de
 * disponibilité. Utilisable pour valider le produit et un trafic modéré.
 * Avant un trafic important, migrer vers un OSRM auto-hébergé ou vers
 * Google Directions API (payant, plus fiable à l'échelle) — le code
 * appelant (création de commande, page de suivi) n'aura pas à changer,
 * seule cette fonction devra être adaptée.
 */

const OSRM_BASE_URL = 'https://router.project-osrm.org';
const FETCH_TIMEOUT_MS = 5000;

export interface RouteResult {
  geoJson: any; // GeoJSON LineString, coordonnées en [lng, lat] (convention OSRM/GeoJSON)
  distanceMeters: number;
  durationSeconds: number;
}

export async function getRoute(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number
): Promise<RouteResult | null> {
  // OSRM attend lng,lat (inverse de lat,lng utilisé partout ailleurs dans
  // le projet) — ne pas inverser cet ordre dans l'URL.
  const url = `${OSRM_BASE_URL}/route/v1/driving/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error('OSRM: réponse non-OK', res.status);
      return null;
    }

    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes?.[0]) {
      console.error('OSRM: pas de trajet trouvé', data.code);
      return null;
    }

    const route = data.routes[0];
    return {
      geoJson: route.geometry, // { type: 'LineString', coordinates: [[lng,lat], ...] }
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch (error) {
    clearTimeout(timeout);
    // OSRM est une amélioration visuelle, jamais un blocant : on log et
    // on continue sans trajet tracé plutôt que de faire échouer la
    // création de commande.
    console.error('OSRM: échec de la requête (timeout ou réseau)', error);
    return null;
  }
}
