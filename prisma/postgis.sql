-- prisma/postgis.sql
--
-- À exécuter UNE FOIS sur la base (avant ou après `npx prisma db push`,
-- l'ordre ne change rien car ce script ne touche pas aux colonnes gérées
-- par Prisma) :
--
--   psql "$DATABASE_URL" -f prisma/postgis.sql
--
-- Objectif : préparer le suivi temps réel à l'échelle de ~10 000 motos.
-- Prisma reste "libre" partout ailleurs : ce script ajoute UNE colonne
-- géospatiale par table concernée, tenue à jour automatiquement par un
-- trigger Postgres. Le code applicatif (routes API, hooks) continue de
-- lire/écrire currentLat/currentLng comme avant, sans aucune modification.
-- Seul le nouveau module src/lib/spatial.ts touche à ces colonnes, pour les
-- requêtes spatiales (livreur le plus proche, appartenance à une zone).

CREATE EXTENSION IF NOT EXISTS postgis;

-- ===================== Rider : position en temps réel =====================

ALTER TABLE "Rider" ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- Trigger : recalcule "location" à chaque écriture de currentLat/currentLng,
-- que ce soit via db.rider.create(), db.rider.update() ou une requête brute.
-- L'app n'a jamais besoin de connaître l'existence de cette colonne.
CREATE OR REPLACE FUNCTION sync_rider_location() RETURNS trigger AS $$
BEGIN
  IF NEW."currentLat" IS NOT NULL AND NEW."currentLng" IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW."currentLng", NEW."currentLat"), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_rider_location ON "Rider";
CREATE TRIGGER trg_sync_rider_location
  BEFORE INSERT OR UPDATE OF "currentLat", "currentLng" ON "Rider"
  FOR EACH ROW EXECUTE FUNCTION sync_rider_location();

-- Backfill pour les lignes déjà existantes au moment de l'exécution du script.
UPDATE "Rider" SET "currentLat" = "currentLat" WHERE "currentLat" IS NOT NULL;

-- Index GiST : indispensable pour que "livreur le plus proche" reste rapide
-- avec des dizaines de milliers de motos (sinon Postgres doit tout scanner).
CREATE INDEX IF NOT EXISTS rider_location_gist ON "Rider" USING GIST (location);

-- ===================== PricingZone : contours de zone (optionnel, futur) =====================

ALTER TABLE "PricingZone" ADD COLUMN IF NOT EXISTS boundary geography(Polygon, 4326);
CREATE INDEX IF NOT EXISTS pricingzone_boundary_gist ON "PricingZone" USING GIST (boundary);

-- ===================== Landmark : repères connus (Tchimbamba ex Mucodec, etc.) =====================

ALTER TABLE "Landmark" ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

CREATE OR REPLACE FUNCTION sync_landmark_location() RETURNS trigger AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_landmark_location ON "Landmark";
CREATE TRIGGER trg_sync_landmark_location
  BEFORE INSERT OR UPDATE OF lat, lng ON "Landmark"
  FOR EACH ROW EXECUTE FUNCTION sync_landmark_location();

UPDATE "Landmark" SET lat = lat WHERE lat IS NOT NULL;

CREATE INDEX IF NOT EXISTS landmark_location_gist ON "Landmark" USING GIST (location);
