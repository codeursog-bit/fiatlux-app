'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import { Rider, DeliveryStatus } from '@/types';
import { Loader2, MapPin, Truck, Navigation, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Dynamic import for Leaflet components
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
const ZoomControl = dynamic(
  () => import('react-leaflet').then((mod) => mod.ZoomControl),
  { ssr: false }
);

interface LiveMapFullProps {
  riders: Rider[];
  selectedRiderId?: string | null;
  onRiderClick?: (rider: Rider) => void;
  className?: string;
}

export function LiveMapFull({ riders, selectedRiderId, onRiderClick, className }: LiveMapFullProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [leaflet, setLeaflet] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    
    import('leaflet').then((L) => {
      setLeaflet(L);
      // Fix for Leaflet default icons
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    });

    return () => clearTimeout(timer);
  }, []);

  const createCustomIcon = (status: string) => {
    if (!leaflet) return null;

    let color = '#2563eb'; // Default Blue (Destination)
    if (status === 'PICKING_UP' || status === 'BUSY') color = '#f59e0b'; // Amber (Collecte)
    if (status === 'IN_TRANSIT' || status === 'ACTIVE') color = '#10b981'; // Green (En Transit)

    return leaflet.divIcon({
      className: 'custom-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full opacity-20 animate-ping" style="background-color: ${color}"></div>
          <div class="relative w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-transform hover:scale-125" style="background-color: ${color}">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  if (!isMounted || !leaflet) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-slate-50", className)}>
        <Loader2 className="w-10 h-10 text-fiatlux-primary animate-spin mb-4" />
        <p className="text-slate-500 font-medium tracking-tight">Initialisation de la carte en direct...</p>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      <MapContainer
        center={[-4.769, 11.859]}
        zoom={13}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ZoomControl position="bottomleft" />
        
        {riders.filter(r => r.currentLocation).map((rider) => {
          const icon = createCustomIcon(rider.status);
          return (
            <Marker
              key={rider.id}
              position={[rider.currentLocation!.lat, rider.currentLocation!.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onRiderClick?.(rider),
              }}
            >
              <Popup className="rider-popup">
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative">
                      {rider.avatar ? (
                        <Image 
                          src={rider.avatar} 
                          alt={rider.name} 
                          fill
                          className="object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-black text-slate-400">
                          {rider.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-none">{rider.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{rider.vehiclePlate}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Vitesse</p>
                      <p className="text-xs font-bold text-slate-700">32 km/h</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Batterie</p>
                      <p className="text-xs font-bold text-emerald-600">84%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-fiatlux-primary shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-600 font-medium leading-relaxed">{rider.currentLocation?.address}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-[10px] text-slate-400 font-bold">Dernière maj: il y a 2m</p>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Overlays */}
      <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-3 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-xl border border-white/20 flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Direct</span>
          </div>
          <div className="w-px h-3 bg-slate-200"></div>
          <p className="text-[10px] font-bold text-slate-500">
            {riders.length} livreurs actifs
          </p>
        </div>
      </div>

      <div className="absolute bottom-6 left-20 z-[1000] pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-white/20">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Légende des statuts</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-500"></span>
              <span className="text-[10px] font-bold text-slate-600">Collecte</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span className="text-[10px] font-bold text-slate-600">Transit</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-blue-600"></span>
              <span className="text-[10px] font-bold text-slate-600">Destination</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
