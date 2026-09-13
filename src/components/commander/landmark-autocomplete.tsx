'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { MapPin, LocateFixed, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });

interface LandmarkResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  pricingZoneId: string | null;
  distanceMeters?: number;
}

export interface LandmarkSelection {
  landmarkId?: string;
  lat?: number;
  lng?: number;
  pricingZoneId?: string | null;
  label: string;
}

interface Props {
  placeholder?: string;
  onSelect: (selection: LandmarkSelection | null) => void;
}

export function LandmarkAutocomplete({ placeholder, onSelect }: Props) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<LandmarkResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const [gpsError, setGpsError] = React.useState<string | null>(null);
  const [confirmed, setConfirmed] = React.useState<LandmarkSelection | null>(null);
  const [showResults, setShowResults] = React.useState(false);
  const [nearbySuggestions, setNearbySuggestions] = React.useState<LandmarkResult[]>([]);
  const [rawGpsPoint, setRawGpsPoint] = React.useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [L, setL] = React.useState<any>(null);

  React.useEffect(() => {
    import('leaflet').then((leaflet) => {
      delete (leaflet as any).Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      setL(leaflet);
    });
  }, []);

  React.useEffect(() => {
    if (confirmed) return; // ne recherche plus une fois un choix fait
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/public/landmarks/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, confirmed]);

  const handlePick = (landmark: LandmarkResult) => {
    setQuery(landmark.name);
    setShowResults(false);
    setNearbySuggestions([]);
    setRawGpsPoint(null);
    const selection: LandmarkSelection = {
      landmarkId: landmark.id,
      lat: landmark.lat,
      lng: landmark.lng,
      pricingZoneId: landmark.pricingZoneId,
      label: landmark.name,
    };
    setConfirmed(selection);
    onSelect(selection);
  };

  const locateOnce = (options: PositionOptions): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  const handleUseGps = async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError("La géolocalisation n'est pas supportée par ce navigateur");
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setGpsError('La géolocalisation nécessite une connexion sécurisée (HTTPS)');
      return;
    }

    setGpsError(null);
    setIsLocating(true);
    try {
      let pos: GeolocationPosition;
      try {
        pos = await locateOnce({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      } catch (firstErr: any) {
        if (firstErr.code === firstErr.PERMISSION_DENIED) throw firstErr;
        pos = await locateOnce({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
      }

      const gpsLat = pos.coords.latitude;
      const gpsLng = pos.coords.longitude;
      const gpsAccuracy = pos.coords.accuracy;

      // Avant d'imposer un point GPS brut (sans nom), on regarde s'il y a
      // un repère connu à proximité (PostGIS) — plus utile pour le
      // chauffeur qu'une simple coordonnée.
      try {
        const res = await fetch(`/api/public/landmarks/nearby?lat=${gpsLat}&lng=${gpsLng}&radius=800`);
        const nearby: LandmarkResult[] = await res.json();
        if (Array.isArray(nearby) && nearby.length > 0) {
          setRawGpsPoint({ lat: gpsLat, lng: gpsLng, accuracy: gpsAccuracy });
          setNearbySuggestions(nearby);
          setIsLocating(false);
          return;
        }
      } catch {
        // si la suggestion échoue, on retombe simplement sur le point GPS brut
      }

      const selection: LandmarkSelection = {
        lat: gpsLat,
        lng: gpsLng,
        pricingZoneId: null,
        label: 'Position GPS actuelle',
      };
      setQuery('📍 Position GPS actuelle');
      setConfirmed(selection);
      onSelect(selection);
      setIsLocating(false);
    } catch (err: any) {
      setIsLocating(false);
      if (err.code === err.PERMISSION_DENIED) {
        setGpsError('Permission refusée — autorisez la géolocalisation via le cadenas dans la barre d\'adresse');
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setGpsError('Position indisponible — vérifiez que la localisation est activée sur votre appareil');
      } else if (err.code === err.TIMEOUT) {
        setGpsError('La détection a pris trop de temps — réessayez');
      } else {
        setGpsError('Impossible de récupérer votre position');
      }
    }
  };

  const handleConfirmGpsRaw = () => {
    if (!rawGpsPoint) return;
    const selection: LandmarkSelection = { ...rawGpsPoint, pricingZoneId: null, label: 'Position GPS actuelle' };
    setQuery('📍 Position GPS actuelle');
    setNearbySuggestions([]);
    setConfirmed(selection);
    onSelect(selection);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    setNearbySuggestions([]);
    setRawGpsPoint(null);
    if (confirmed) {
      setConfirmed(null);
      onSelect(null);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className={cn('absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5', confirmed ? 'text-emerald-500' : 'text-neutral-400')} />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder || 'Ex: Ngoyo Péage, Tchimbamba SNE...'}
          className={cn(
            'w-full h-14 pl-12 pr-10 rounded-2xl border-2 text-sm focus:outline-none',
            confirmed ? 'border-emerald-200 bg-emerald-50/30' : 'border-neutral-200'
          )}
        />
        {confirmed && <Check className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />}
        {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-neutral-400" />}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white border-2 border-neutral-100 rounded-2xl shadow-lg overflow-hidden">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handlePick(r)}
              className="w-full text-left px-4 py-3 hover:bg-neutral-50 text-sm font-medium flex items-center gap-2 border-b border-neutral-50 last:border-0"
            >
              <MapPin className="h-4 w-4 text-neutral-400 shrink-0" />
              {r.name}
            </button>
          ))}
        </div>
      )}

      {nearbySuggestions.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white border-2 border-neutral-100 rounded-2xl shadow-lg overflow-hidden">
          <p className="px-4 pt-3 pb-2 text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Repères connus près de vous
          </p>

          {/* Mini-carte : point bleu = votre position exacte, épingles = repères connus autour */}
          {L && rawGpsPoint && (
            <div className="mx-3 mb-2 h-36 rounded-xl overflow-hidden border border-neutral-100">
              <MapContainer
                center={[rawGpsPoint.lat, rawGpsPoint.lng]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
                zoomControl={false}
                dragging={true}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Circle
                  center={[rawGpsPoint.lat, rawGpsPoint.lng]}
                  radius={rawGpsPoint.accuracy || 30}
                  pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.12, weight: 1 }}
                />
                <Marker
                  position={[rawGpsPoint.lat, rawGpsPoint.lng]}
                  icon={L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;box-shadow:0 0 0 4px rgba(37,99,235,.3), 0 0 0 2px white;"></div>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7],
                  })}
                />
                {nearbySuggestions.map((r) => (
                  <Marker
                    key={r.id}
                    position={[r.lat, r.lng]}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `<div style="background:#0d4270;color:white;padding:2px 6px;border-radius:5px;font-size:9px;font-weight:700;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.3)">${r.name}</div>`,
                      iconSize: [0, 0],
                    })}
                    eventHandlers={{ click: () => handlePick(r) }}
                  />
                ))}
              </MapContainer>
            </div>
          )}

          {nearbySuggestions.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handlePick(r)}
              className="w-full text-left px-4 py-3 hover:bg-neutral-50 text-sm font-medium flex items-center justify-between gap-2 border-b border-neutral-50 last:border-0"
            >
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-neutral-400 shrink-0" />{r.name}</span>
              {r.distanceMeters != null && (
                <span className="text-[10px] text-fiatlux-primary font-bold shrink-0">
                  {r.distanceMeters < 1000 ? `${Math.round(r.distanceMeters)} m` : `${(r.distanceMeters / 1000).toFixed(1)} km`}
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={handleConfirmGpsRaw}
            className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-neutral-400 hover:text-fiatlux-primary uppercase tracking-wide"
          >
            Aucun ne correspond — utiliser ma position exacte
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleUseGps}
        disabled={isLocating}
        className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-fiatlux-primary uppercase tracking-wide"
      >
        {isLocating ? <Loader2 className="h-3 w-3 animate-spin" /> : <LocateFixed className="h-3 w-3" />}
        Utiliser ma position GPS actuelle
      </button>

      {gpsError && (
        <p className="text-[10px] text-red-500 font-medium mt-1">{gpsError}</p>
      )}

      {confirmed && !confirmed.landmarkId && (
        <p className="text-[10px] text-amber-600 font-medium mt-1">
          Position GPS précise enregistrée (sans repère nommé).
        </p>
      )}
    </div>
  );
}