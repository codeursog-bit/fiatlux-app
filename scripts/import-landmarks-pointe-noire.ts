/**
 * Import automatique des repères de Pointe-Noire dans la table Landmark.
 *
 * IMPORTANT — pourquoi OpenStreetMap et pas Google Maps :
 * Google interdit contractuellement (ToS) d'extraire/scraper les données de
 * Google Maps pour les réutiliser ailleurs, même partiellement — un script
 * qui le ferait exposerait le projet à un blocage d'API voire un risque
 * juridique. La seule voie légale côté Google est l'API Places, payante et
 * avec clé, pour un usage aussi massif que peupler toute une ville. On a
 * déjà OSRM (OpenStreetMap) pour le calcul d'itinéraire dans l'app — ce
 * script utilise la même source de données (gratuite, ouverte, pas de clé),
 * ce qui reste cohérent avec le reste du projet. Si un jour tu passes sur
 * l'API Google Maps payante, on pourra écrire un script équivalent contre
 * l'API Places à ce moment-là.
 *
 * IMPORTANT — pourquoi un rayon et pas le contour administratif exact :
 * La cartographie OSM de Pointe-Noire est un projet communautaire encore
 * jeune (Open Cities Africa, depuis 2018) : à ce jour la ville n'a PAS de
 * relation "boundary" (frontière administrative) dans OSM, seulement un
 * node "place=city" pour le centre-ville (vérifié via Nominatim — le seul
 * résultat renvoyé est un node, pas une relation). On ne peut donc pas
 * utiliser area(id) comme prévu initialement. À la place, on interroge
 * Overpass avec (around:RAYON,lat,lon) centré sur ce node. Pointe-Noire
 * étant assez isolée géographiquement (façade océanique + pas d'autre
 * grande ville collée), un rayon de 15 km couvre le tissu urbain sans
 * remonter des lieux d'une autre commune. À ajuster si des repères
 * manquent en périphérie (Loandjili, Mongo-Mpoukou côté nord-est
 * notamment) ou si au contraire ça déborde vers des villages voisins.
 *
 * Ce que fait le script :
 *  1. Récupère les coordonnées du centre de Pointe-Noire via Nominatim.
 *  2. Interroge Overpass (la base de requêtes d'OSM) pour tous les nœuds
 *     tagués comme quartier/suburb, ainsi qu'une liste de repères utiles
 *     pour un livreur (marchés, stations-service, lieux de culte, écoles,
 *     hôpitaux) dans un rayon autour de ce centre.
 *  3. Dédoublonne contre les Landmark déjà en base (même nom proche ou à
 *     moins de 80m d'un repère existant) avant d'insérer.
 *  4. Tourne en mode aperçu par défaut (--apply pour écrire réellement).
 *
 * Usage :
 *   npx tsx scripts/import-landmarks-pointe-noire.ts            # aperçu seul
 *   npx tsx scripts/import-landmarks-pointe-noire.ts --apply     # écrit en base
 */

import { PrismaClient } from '@prisma/client';
import { haversineDistanceMeters } from '../src/lib/geo';

const prisma = new PrismaClient();

const CITY_NAME = 'Pointe-Noire';
const COUNTRY = 'Congo-Brazzaville';
const DEDUPE_RADIUS_METERS = 80;
const SEARCH_RADIUS_METERS = 25000;

// Tags OSM ciblés. On reste volontairement large sur les quartiers (le vrai
// besoin exprimé), et raisonnable sur les POI pour ne pas noyer la table
// avec des milliers de petites boutiques non pertinentes comme repère.
const OVERPASS_TAGS: { key: string; valuePattern: string }[] = [
  { key: 'place', valuePattern: 'suburb|neighbourhood|quarter|village|town' },
  { key: 'amenity', valuePattern: 'marketplace|fuel|place_of_worship|school|hospital|university|bus_station' },
  { key: 'shop', valuePattern: 'supermarket|mall' },
];

type OverpassElement = {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

async function resolveCityCenter(): Promise<{ lat: number; lon: number }> {
  const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(
    CITY_NAME
  )}&country=${encodeURIComponent(COUNTRY)}&format=json&polygon_geojson=0&limit=5`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'fiatlux-landmark-import/1.0 (usage interne)' },
  });
  if (!res.ok) throw new Error(`Nominatim: ${res.status}`);
  const results = (await res.json()) as any[];
  if (results.length === 0) {
    throw new Error(`Ville "${CITY_NAME}" introuvable sur Nominatim — vérifier l'orthographe/pays.`);
  }

  console.log('Résultats Nominatim bruts :');
  results.forEach((r, i) =>
    console.log(`  [${i}] osm_type=${r.osm_type} osm_id=${r.osm_id} class=${r.class} type=${r.type} — ${r.display_name}`)
  );

  // Pas de relation "boundary" pour Pointe-Noire dans OSM à ce jour (voir
  // commentaire en tête de fichier) — on prend le node/way "place=city" le
  // plus pertinent comme centre, et on cherchera ensuite dans un rayon
  // autour de ce point plutôt que dans un polygone.
  const cityPoint = results.find((r) => r.class === 'place' && ['city', 'town', 'administrative'].includes(r.type)) ?? results[0];

  return { lat: parseFloat(cityPoint.lat), lon: parseFloat(cityPoint.lon) };
}

async function fetchLandmarksNearCenter(center: { lat: number; lon: number }): Promise<OverpassElement[]> {
  const around = `around:${SEARCH_RADIUS_METERS},${center.lat},${center.lon}`;
  const tagFilters = OVERPASS_TAGS.map((t) => `  node["${t.key}"~"${t.valuePattern}"](${around});`).join('\n');

  const query = `
    [out:json][timeout:60];
    (
${tagFilters}
    );
    out body;
  `;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'User-Agent': 'fiatlux-landmark-import/1.0' },
    body: query,
  });
  if (!res.ok) throw new Error(`Overpass: ${res.status} — ${await res.text()}`);
  const data = (await res.json()) as { elements: OverpassElement[] };
  return data.elements.filter((e) => e.tags?.name && e.lat && e.lon);
}

async function main() {
  const apply = process.argv.includes('--apply');

  console.log(`Résolution du centre de "${CITY_NAME}"...`);
  const center = await resolveCityCenter();
  console.log(`Centre retenu : ${center.lat}, ${center.lon} (rayon de recherche : ${SEARCH_RADIUS_METERS / 1000}km)`);

  console.log('Interrogation d\'Overpass (peut prendre 10-30s)...');
  const elements = await fetchLandmarksNearCenter(center);
  console.log(`${elements.length} lieux trouvés sur OSM.`);

  const existing = await prisma.landmark.findMany({ select: { name: true, lat: true, lng: true } });

  let created = 0;
  let skipped = 0;

  for (const el of elements) {
    const name = el.tags!.name.trim();
    const lat = el.lat;
    const lng = el.lon;

    const isDuplicate = existing.some(
      (l) =>
        l.name.toLowerCase() === name.toLowerCase() ||
        haversineDistanceMeters(l.lat, l.lng, lat, lng) < DEDUPE_RADIUS_METERS
    );

    if (isDuplicate) {
      skipped++;
      continue;
    }

    console.log(`${apply ? '+ Créé' : '(aperçu) créerait'} : ${name} [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);

    if (apply) {
      await prisma.landmark.create({ data: { name, lat, lng } });
      // Évite les doublons entre deux éléments OSM très proches dans cette
      // même exécution (pas seulement contre la base au démarrage).
      existing.push({ name, lat, lng });
    }
    created++;
  }

  console.log(`\n${apply ? 'Import terminé' : 'Aperçu terminé'} : ${created} repère(s) ${apply ? 'créé(s)' : 'à créer'}, ${skipped} déjà existant(s) ignoré(s).`);
  if (!apply) {
    console.log('Relance avec --apply pour écrire réellement en base.');
  }
}

main()
  .catch((err) => {
    console.error('Erreur:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());