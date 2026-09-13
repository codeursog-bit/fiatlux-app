'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { Loader2, Navigation } from 'lucide-react';
import type { LandmarkSelection } from './landmark-autocomplete';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });

interface Props {
  pickup: LandmarkSelection;
  dropoff: LandmarkSelection;
}

/**
 * Dessine automatiquement le trajet routier réel entre le point de collecte
 * et le point de livraison — la personne choisit juste des lieux connus
 * (autocomplete), elle n'a jamais besoin de cliquer elle-même sur une carte.
 */
export function RoutePreviewMap({ pickup, dropoff }: Props) {
  const [routeCoords, setRouteCoords] = React.useState<[number, number][] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [distanceKm, setDistanceKm] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (pickup.lat == null || pickup.lng == null || dropoff.lat == null || dropoff.lng == null) return;

    let cancelled = false;
    setIsLoading(true);
    setRouteCoords(null);

    const params = new URLSearchParams({
      pickupLat: String(pickup.lat),
      pickupLng: String(pickup.lng),
      dropoffLat: String(dropoff.lat),
      dropoffLng: String(dropoff.lng),
    });

    fetch(`/api/public/route?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.geoJson?.coordinates) {
          // GeoJSON OSRM = [lng, lat] ; Leaflet attend [lat, lng].
          setRouteCoords(data.geoJson.coordinates.map((c: [number, number]) => [c[1], c[0]]));
          setDistanceKm(data.distanceMeters ? data.distanceMeters / 1000 : null);
        } else {
          setRouteCoords(null);
        }
      })
      .catch(() => { if (!cancelled) setRouteCoords(null); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]);

  if (pickup.lat == null || pickup.lng == null || dropoff.lat == null || dropoff.lng == null) return null;

  const pickupPos: [number, number] = [pickup.lat, pickup.lng];
  const dropoffPos: [number, number] = [dropoff.lat, dropoff.lng];
  const hasRoute = routeCoords && routeCoords.length > 1;

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border-2 border-neutral-100 overflow-hidden h-[220px] relative">
        <MapContainer
          center={pickupPos}
          bounds={[pickupPos, dropoffPos]}
          boundsOptions={{ padding: [30, 30] }}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          dragging={true}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={pickupPos} />
          <Marker position={dropoffPos} />
          <Polyline
            positions={hasRoute ? routeCoords! : [pickupPos, dropoffPos]}
            color="#0d4270"
            weight={hasRoute ? 4 : 2}
            dashArray={hasRoute ? undefined : '6, 10'}
          />
        </MapContainer>
        {isLoading && (
          <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 shadow">
            <Loader2 className="w-3 h-3 animate-spin" /> Calcul du trajet...
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium px-1">
        <Navigation className="w-3 h-3" />
        {hasRoute && distanceKm
          ? `Trajet calculé automatiquement — environ ${distanceKm.toFixed(1)} km`
          : 'Trajet estimé (à vol d\'oiseau) — itinéraire routier indisponible pour le moment'}
      </div>
    </div>
  );
}
