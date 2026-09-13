'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

import { useRiders } from '@/hooks/use-riders';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function LiveMapPreview() {
  const { data: riders, isLoading } = useRiders();

  useEffect(() => {
    // Fix for Leaflet default icons in Next.js
    import('leaflet').then((L) => {
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    });
  }, []);

  const locatedRiders = riders?.filter((r: any) => r.currentLat != null && r.currentLng != null) || [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden h-[450px] relative">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-fiatlux-primary"></span>
          <h2 className="text-sm font-bold text-slate-900">Carte de répartition des livreurs</h2>
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
        </div>
        <span className="text-[10px] text-slate-500 font-medium">{locatedRiders.length} localisé{locatedRiders.length > 1 ? 's' : ''}</span>
      </div>
      <div className="flex-1 relative bg-slate-50 overflow-hidden select-none">
        <MapContainer 
          center={[-4.769, 11.859]} 
          zoom={12} 
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {locatedRiders.map((rider: any) => (
            <Marker 
              key={rider.id} 
              position={[rider.currentLat, rider.currentLng]}
            >
              <Popup>
                <div className="text-xs p-1">
                  <p className="font-bold text-slate-900">{rider.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{rider.vehiclePlate}</p>
                  <div className="mt-2 flex items-center gap-1.5 border-t border-slate-50 pt-2">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      rider.status === 'ACTIVE' ? "bg-green-500 animate-pulse" : "bg-amber-500"
                    )} />
                    <span className="text-[10px] font-black uppercase text-slate-600">{rider.status}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {!isLoading && locatedRiders.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
            <div className="bg-white/95 border border-slate-200 px-4 py-2 rounded-lg shadow-sm">
              <p className="text-xs text-slate-500 font-medium">Aucun livreur localisé pour le moment.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}