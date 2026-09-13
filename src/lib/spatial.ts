import { db } from '@/lib/db';

/**
 * Requêtes spatiales dédiées, isolées du reste de l'app.
 *
 * Prisma n'a pas de support natif pour les types géométriques PostGIS : ces
 * fonctions passent par `$queryRaw` uniquement pour ces cas précis (recherche
 * du livreur le plus proche à l'échelle de milliers de motos, appartenance à
 * une zone dessinée). Tout le reste du code continue d'utiliser le client
 * Prisma typé normalement (currentLat/currentLng, etc.) — PostGIS n'est ni
 * un remplacement ni une contrainte ailleurs dans l'app.
 *
 * Pré-requis : avoir exécuté prisma/postgis.sql une fois sur la base.
 */

export interface NearestRider {
  id: string;
  name: string;
  phone: string;
  vehiclePlate: string;
  distanceMeters: number;
}

/**
 * Retourne les N livreurs ACTIVE les plus proches d'un point, triés par
 * distance réelle (pas une simple boîte englobante). S'appuie sur l'index
 * GiST de Rider.location : reste rapide même avec 10 000+ motos, contrairement
 * à charger tous les riders et calculer la distance en JS (approche utilisée
 * ailleurs dans l'app pour des besoins ponctuels, volontairement conservée
 * telle quelle — voir src/lib/geo.ts).
 */
export async function findNearestActiveRiders(
  lat: number,
  lng: number,
  radiusMeters: number = 5000,
  limit: number = 10
): Promise<NearestRider[]> {
  return db.$queryRaw<NearestRider[]>`
    SELECT
      id,
      name,
      phone,
      "vehiclePlate",
      ST_Distance(location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS "distanceMeters"
    FROM "Rider"
    WHERE status = 'ACTIVE'
      AND location IS NOT NULL
      AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})
    ORDER BY location <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    LIMIT ${limit};
  `;
}

/**
 * Retrouve la zone de tarification dont le polygone contient ce point.
 * Renvoie null si aucune zone dessinée ne couvre le point (fallback normal
 * tant que les zones ne sont pas dessinées : l'app continue d'utiliser le
 * rattachement manuel par repère existant dans PricingZone/Landmark).
 */
export async function findZoneForPoint(lat: number, lng: number): Promise<{ id: string; zoneName: string } | null> {
  const rows = await db.$queryRaw<{ id: string; zoneName: string }[]>`
    SELECT id, "zoneName"
    FROM "PricingZone"
    WHERE boundary IS NOT NULL
      AND ST_Contains(boundary::geometry, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
    LIMIT 1;
  `;
  return rows[0] ?? null;
}

export interface NearbyLandmark {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
}

/**
 * Repères connus les plus proches d'une position GPS (utilisé quand la
 * personne utilise le bouton "Ma position" au lieu de taper un nom — on lui
 * suggère les lieux connus à proximité plutôt que de forcer un point brut ;
 * sert aussi côté admin pour repérer un doublon avant d'en créer un nouveau).
 */
export async function findNearbyLandmarks(
  lat: number,
  lng: number,
  radiusMeters: number = 1500,
  limit: number = 5
): Promise<NearbyLandmark[]> {
  return db.$queryRaw<NearbyLandmark[]>`
    SELECT
      id,
      name,
      lat,
      lng,
      ST_Distance(location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS "distanceMeters"
    FROM "Landmark"
    WHERE active = true
      AND location IS NOT NULL
      AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})
    ORDER BY location <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    LIMIT ${limit};
  `;
}
