'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useLandmarks, useCreateLandmark, useUpdateLandmark, useDeleteLandmark } from '@/hooks/use-landmarks';
import { usePricingZones, useCreatePricingZone, useSaveZoneBoundary, useDeleteZoneBoundary } from '@/hooks/use-pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MapPinned, Loader2, Trash2, Search, Info, X, Shapes, Undo2, Check, LocateFixed } from 'lucide-react';
import { cn } from '@/lib/utils';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then((m) => m.Polygon), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });

// Palette pour distinguer visuellement les zones dessinées sur la carte.
const ZONE_COLORS = ['#0d4270', '#b45309', '#047857', '#7c3aed', '#be123c', '#0e7490'];

// Pointe-Noire, centre-ville (repère de référence)
const PN_CENTER: [number, number] = [-4.7975, 11.8503];

export default function ReperesPage() {
  const [activeTab, setActiveTab] = React.useState<'points' | 'zones'>('points');

  const { data: landmarks, isLoading } = useLandmarks();
  const { data: zones } = usePricingZones();
  const createLandmark = useCreateLandmark();
  const updateLandmark = useUpdateLandmark();
  const deleteLandmark = useDeleteLandmark();
  const createZone = useCreatePricingZone();
  const saveZoneBoundary = useSaveZoneBoundary();
  const deleteZoneBoundary = useDeleteZoneBoundary();

  const [L, setL] = React.useState<any>(null);
  const [pendingPoint, setPendingPoint] = React.useState<{ lat: number; lng: number } | null>(null);
  const [search, setSearch] = React.useState('');
  const [name, setName] = React.useState('');
  const [aliases, setAliases] = React.useState('');
  const [zoneId, setZoneId] = React.useState('');
  const [MapEventsCatcher, setMapEventsCatcher] = React.useState<any>(null);
  const [MapFlyer, setMapFlyer] = React.useState<any>(null);

  // --- Géolocalisation ("Ma position") ---
  const [myLocation, setMyLocation] = React.useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locating, setLocating] = React.useState(false);
  const [flyTarget, setFlyTarget] = React.useState<{ lat: number; lng: number; nonce: number } | null>(null);

  // --- Dessin de zones (polygones) ---
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [drawingPoints, setDrawingPoints] = React.useState<{ lat: number; lng: number }[]>([]);
  const [newZoneName, setNewZoneName] = React.useState('');
  const [selectedExistingZoneId, setSelectedExistingZoneId] = React.useState('');

  React.useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet);
      // @ts-ignore
      delete leaflet.Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    });
    import('react-leaflet').then((mod) => {
      // Composant enfant : capte les clics sur la carte pour poser le point exact.
      // Doit vivre à l'intérieur de <MapContainer> pour utiliser useMapEvents.
      const Catcher = ({ onPick }: { onPick: (lat: number, lng: number) => void }) => {
        mod.useMapEvents({
          click(e: any) {
            onPick(e.latlng.lat, e.latlng.lng);
          },
        });
        return null;
      };
      setMapEventsCatcher(() => Catcher);

      // Composant enfant : recentre la carte quand on demande "Ma position"
      // (doit aussi vivre à l'intérieur de <MapContainer> pour utiliser useMap).
      const Flyer = ({ target }: { target: { lat: number; lng: number; nonce: number } | null }) => {
        const map = mod.useMap();
        React.useEffect(() => {
          if (target) {
            map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 16), { duration: 1 });
          }
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [target?.nonce]);
        return null;
      };
      setMapFlyer(() => Flyer);
    });
  }, []);

  const filtered = React.useMemo(() => {
    if (!landmarks) return [];
    if (!search.trim()) return landmarks;
    const q = search.trim().toLowerCase();
    return landmarks.filter(
      (lm: any) => lm.name.toLowerCase().includes(q) || lm.aliases?.some((a: string) => a.includes(q))
    );
  }, [landmarks, search]);

  // Applique la position détectée : en "Repères", elle devient directement le
  // point en attente de nom ; en "Zones" pendant un tracé, elle s'ajoute au tracé.
  const applyLocation = (lat: number, lng: number) => {
    if (activeTab === 'points') {
      setPendingPoint({ lat, lng });
      toast.success('Position récupérée — donnez un nom au repère ci-dessous pour l\'enregistrer');
    } else if (activeTab === 'zones' && isDrawing) {
      setDrawingPoints((prev) => [...prev, { lat, lng }]);
      toast.success('Point ajouté au tracé de la zone');
    } else if (activeTab === 'zones' && !isDrawing) {
      toast('Cliquez sur "Nouvelle zone" pour démarrer un tracé, puis relancez la géolocalisation.');
    }
  };

  const locateOnce = (options: PositionOptions): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  const handleLocateMe = async () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par ce navigateur");
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      toast.error("La géolocalisation nécessite une connexion sécurisée (HTTPS) — impossible en http:// hors localhost");
      return;
    }

    setLocating(true);
    try {
      let pos: GeolocationPosition;
      try {
        // 1ère tentative : haute précision (GPS), délai généreux.
        pos = await locateOnce({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      } catch (firstErr: any) {
        // Repli : précision réseau/Wi-Fi, souvent plus fiable en intérieur ou sur PC sans GPS.
        if (firstErr.code === firstErr.PERMISSION_DENIED) throw firstErr;
        pos = await locateOnce({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
      }

      const { latitude, longitude, accuracy } = pos.coords;
      setMyLocation({ lat: latitude, lng: longitude, accuracy });
      setFlyTarget({ lat: latitude, lng: longitude, nonce: Date.now() });
      applyLocation(latitude, longitude);
    } catch (err: any) {
      if (err.code === err.PERMISSION_DENIED) {
        toast.error('Permission refusée — autorisez la géolocalisation via le cadenas dans la barre d\'adresse, puis réessayez');
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        toast.error("Position indisponible — vérifiez que la localisation est activée sur l'appareil, ou cliquez directement sur la carte");
      } else if (err.code === err.TIMEOUT) {
        toast.error('La détection a pris trop de temps — réessayez, ou cliquez directement sur la carte');
      } else {
        toast.error('Impossible de récupérer votre position — cliquez directement sur la carte à la place');
      }
    } finally {
      setLocating(false);
    }
  };

  const resetForm = () => {
    setPendingPoint(null);
    setName('');
    setAliases('');
    setZoneId('');
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (activeTab === 'zones' && isDrawing) {
      setDrawingPoints((prev) => [...prev, { lat, lng }]);
    } else if (activeTab === 'points') {
      setPendingPoint({ lat, lng });
    }
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setDrawingPoints([]);
    setNewZoneName('');
    setSelectedExistingZoneId('');
  };

  const undoLastPoint = () => {
    setDrawingPoints((prev) => prev.slice(0, -1));
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
  };

  const handleSaveZoneBoundary = async () => {
    if (drawingPoints.length < 3) {
      toast.error('Il faut au moins 3 points pour fermer un contour');
      return;
    }
    let targetZoneId = selectedExistingZoneId;
    try {
      if (!targetZoneId) {
        if (!newZoneName.trim()) {
          toast.error('Choisissez une zone existante ou nommez la nouvelle zone');
          return;
        }
        const created = await createZone.mutateAsync(newZoneName.trim());
        targetZoneId = created.id;
      }
      await saveZoneBoundary.mutateAsync({ zoneId: targetZoneId, points: drawingPoints });
      toast.success('Contour de zone enregistré');
      cancelDrawing();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Impossible d'enregistrer le contour");
    }
  };

  const handleDeleteZoneBoundary = async (zid: string) => {
    try {
      await deleteZoneBoundary.mutateAsync(zid);
      toast.success('Contour effacé');
    } catch {
      toast.error("Impossible d'effacer le contour");
    }
  };

  const handleSave = async () => {
    if (!pendingPoint) {
      toast.error('Cliquez sur la carte pour poser le point exact du repère');
      return;
    }
    if (!name.trim()) {
      toast.error('Nom du repère requis');
      return;
    }
    try {
      await createLandmark.mutateAsync({
        name: name.trim(),
        aliases: aliases.split(',').map((a) => a.trim()).filter(Boolean),
        lat: pendingPoint.lat,
        lng: pendingPoint.lng,
        pricingZoneId: zoneId || null,
      });
      toast.success(`Repère "${name}" enregistré`);
      resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Impossible d'enregistrer le repère");
    }
  };

  const handleToggleActive = async (lm: any) => {
    try {
      await updateLandmark.mutateAsync({ id: lm.id, payload: { active: !lm.active } });
    } catch {
      toast.error('Impossible de mettre à jour le repère');
    }
  };

  const handleDelete = async (lm: any) => {
    try {
      const result: any = await deleteLandmark.mutateAsync(lm.id);
      toast.success(result?.deactivated ? 'Repère désactivé (utilisé par des commandes existantes)' : 'Repère supprimé');
    } catch {
      toast.error('Impossible de supprimer le repère');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <MapPinned className="w-5 h-5 text-fiatlux-primary" />
              Repères & Zones
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'points'
                ? "Cliquez sur la carte pour poser un point exact (ex: \"Tchimbamba ex Mucodec\") — le client le retrouve par recherche, sans cliquer lui-même sur une carte."
                : "Dessinez le contour d'un quartier point par point — utile pour le reporting par zone ou une future tarification par secteur."}
            </p>
          </div>
          <div className="flex bg-slate-100 rounded-lg p-1 shrink-0">
            <button
              onClick={() => { setActiveTab('points'); cancelDrawing(); }}
              className={cn('px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors', activeTab === 'points' ? 'bg-white text-fiatlux-primary shadow-sm' : 'text-slate-500')}
            >
              <MapPinned className="w-3.5 h-3.5" /> Repères
            </button>
            <button
              onClick={() => { setActiveTab('zones'); resetForm(); }}
              className={cn('px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors', activeTab === 'zones' ? 'bg-white text-fiatlux-primary shadow-sm' : 'text-slate-500')}
            >
              <Shapes className="w-3.5 h-3.5" /> Zones
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
          {/* Panneau latéral */}
          <div className="lg:col-span-1 flex flex-col bg-white border border-slate-200 rounded-lg shadow-sm min-h-0">
            {activeTab === 'points' ? (
              <>
                <div className="p-3 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher un repère..."
                      className="h-9 pl-9 text-xs"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                  {isLoading && (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-4 h-4 animate-spin text-fiatlux-primary" />
                    </div>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-10 italic">Aucun repère trouvé.</p>
                  )}
                  {filtered.map((lm: any) => (
                    <div key={lm.id} className={cn("p-3 flex items-start justify-between gap-2", !lm.active && "opacity-40")}>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{lm.name}</p>
                        {lm.aliases?.length > 0 && (
                          <p className="text-[10px] text-slate-400 truncate">{lm.aliases.join(', ')}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          {lm.pricingZone && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{lm.pricingZone.zoneName}</Badge>
                          )}
                          {!lm.active && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-red-200 text-red-500">Désactivé</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleActive(lm)}
                          className="text-[9px] font-bold uppercase text-slate-400 hover:text-fiatlux-primary px-1.5"
                          title={lm.active ? 'Désactiver' : 'Réactiver'}
                        >
                          {lm.active ? 'Off' : 'On'}
                        </button>
                        <button
                          onClick={() => handleDelete(lm)}
                          className="text-slate-300 hover:text-red-500 p-1"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="p-3 border-b border-slate-100">
                  <Button
                    onClick={startDrawing}
                    disabled={isDrawing}
                    className="w-full h-9 bg-fiatlux-primary text-white text-[10px] font-bold uppercase"
                  >
                    <Shapes className="w-3.5 h-3.5 mr-1.5" /> Nouvelle zone
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                  {(!zones || zones.length === 0) && (
                    <p className="text-xs text-slate-400 text-center py-10 italic">Aucune zone créée.</p>
                  )}
                  {zones?.map((z: any, i: number) => (
                    <div key={z.id} className="p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }} />
                        <p className="text-xs font-bold text-slate-900 truncate">{z.zoneName}</p>
                        {!z.boundary && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0">Sans contour</Badge>}
                      </div>
                      {z.boundary && (
                        <button
                          onClick={() => handleDeleteZoneBoundary(z.id)}
                          className="text-slate-300 hover:text-red-500 p-1 shrink-0"
                          title="Effacer le contour"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Carte + formulaire */}
          <div className="lg:col-span-2 flex flex-col bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden min-h-0">
            <div className="flex-1 relative min-h-[300px]">
              <MapContainer center={PN_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {MapEventsCatcher && <MapEventsCatcher onPick={handleMapClick} />}
                {MapFlyer && <MapFlyer target={flyTarget} />}

                {/* Point bleu : ma position détectée par géolocalisation */}
                {L && myLocation && (
                  <>
                    <Circle
                      center={[myLocation.lat, myLocation.lng]}
                      radius={myLocation.accuracy || 30}
                      pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.12, weight: 1 }}
                    />
                    <Marker
                      position={[myLocation.lat, myLocation.lng]}
                      icon={L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;box-shadow:0 0 0 4px rgba(37,99,235,.3), 0 0 0 2px white;"></div>`,
                        iconSize: [14, 14],
                        iconAnchor: [7, 7],
                      })}
                    />
                  </>
                )}

                {/* Onglet Repères */}
                {L && activeTab === 'points' && landmarks?.filter((lm: any) => lm.active).map((lm: any) => (
                  <Marker
                    key={lm.id}
                    position={[lm.lat, lm.lng]}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `<div style="background:#0d4270;color:white;padding:3px 7px;border-radius:6px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">${lm.name}</div>`,
                      iconSize: [0, 0],
                    })}
                  />
                ))}
                {L && activeTab === 'points' && pendingPoint && !(myLocation && myLocation.lat === pendingPoint.lat && myLocation.lng === pendingPoint.lng) && (
                  <Marker
                    position={[pendingPoint.lat, pendingPoint.lng]}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `<div style="background:#f59e0b;color:white;padding:5px;border-radius:50%;box-shadow:0 0 0 4px rgba(245,158,11,.3)"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="8"/></svg></div>`,
                      iconSize: [22, 22],
                      iconAnchor: [11, 11],
                    })}
                  />
                )}

                {/* Onglet Zones : contours déjà enregistrés */}
                {activeTab === 'zones' && zones?.filter((z: any) => z.boundary).map((z: any, i: number) => (
                  <Polygon
                    key={z.id}
                    positions={z.boundary.coordinates[0].map((c: [number, number]) => [c[1], c[0]])}
                    pathOptions={{ color: ZONE_COLORS[i % ZONE_COLORS.length], weight: 2, fillOpacity: 0.12 }}
                  />
                ))}

                {/* Onglet Zones : tracé en cours */}
                {activeTab === 'zones' && drawingPoints.length > 0 && (
                  <>
                    {drawingPoints.length >= 3 ? (
                      <Polygon
                        positions={drawingPoints.map((p) => [p.lat, p.lng])}
                        pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '6,6', fillOpacity: 0.15 }}
                      />
                    ) : (
                      <Polyline
                        positions={drawingPoints.map((p) => [p.lat, p.lng])}
                        pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '6,6' }}
                      />
                    )}
                    {L && drawingPoints.map((p, i) => (
                      <Marker
                        key={i}
                        position={[p.lat, p.lng]}
                        icon={L.divIcon({
                          className: 'custom-div-icon',
                          html: `<div style="background:#f59e0b;width:9px;height:9px;border-radius:50%;box-shadow:0 0 0 2px white"></div>`,
                          iconSize: [9, 9],
                          iconAnchor: [4, 4],
                        })}
                      />
                    ))}
                  </>
                )}
              </MapContainer>

              {/* Bouton flottant : géolocalisation */}
              <button
                onClick={handleLocateMe}
                disabled={locating}
                className="absolute top-3 right-3 z-[1000] bg-white shadow-md border border-slate-200 rounded-full w-10 h-10 flex items-center justify-center text-fiatlux-primary hover:bg-slate-50 transition-colors disabled:opacity-60"
                title="Me géolocaliser"
              >
                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4.5 h-4.5" />}
              </button>

              {/* Carte de confirmation après géolocalisation */}
              {myLocation && (
                <div className="absolute top-16 right-3 z-[1000] bg-white shadow-md border border-slate-200 rounded-lg p-3 w-60 space-y-2">
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Position détectée{myLocation.accuracy ? ` (précision ~${Math.round(myLocation.accuracy)} m)` : ''} — vérifiez le point bleu sur la carte.
                    {activeTab === 'points'
                      ? ' Elle a été reprise comme point du repère : donnez-lui un nom en bas pour enregistrer.'
                      : isDrawing
                        ? ' Elle a été ajoutée au tracé de la zone.'
                        : ' Démarrez un tracé ("Nouvelle zone") puis relancez la géolocalisation pour l\'ajouter.'}
                  </p>
                  <Button variant="outline" onClick={() => setMyLocation(null)} className="h-7 w-full text-[10px] font-bold uppercase">
                    <X className="w-3.5 h-3.5 mr-1.5" /> Fermer
                  </Button>
                </div>
              )}

              {activeTab === 'points' && !pendingPoint && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 pointer-events-none">
                  <Info className="w-3 h-3" /> Cliquez sur la carte pour poser un repère
                </div>
              )}
              {activeTab === 'zones' && isDrawing && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 pointer-events-none">
                  <Info className="w-3 h-3" /> Cliquez pour ajouter des points ({drawingPoints.length} posé{drawingPoints.length > 1 ? 's' : ''}, 3 minimum)
                </div>
              )}
            </div>

            {/* Formulaire bas de carte */}
            <div className="border-t border-slate-100 p-4">
              {activeTab === 'points' ? (
                pendingPoint ? (
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-slate-500">Nom du repère</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder='Ex: "Tchimbamba ex Mucodec"' className="h-9 text-xs" autoFocus />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-slate-500">Alias (séparés par virgule)</Label>
                      <Input value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="mucodec, ex mucodec" className="h-9 text-xs" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={createLandmark.isPending} className="h-9 bg-fiatlux-primary text-white text-[10px] font-bold uppercase px-4">
                        {createLandmark.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Enregistrer'}
                      </Button>
                      <Button variant="outline" onClick={resetForm} className="h-9 w-9 p-0"><X className="w-4 h-4" /></Button>
                    </div>
                    {zones && zones.length > 0 && (
                      <div className="md:col-span-3 space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Zone (statistiques uniquement)</Label>
                        <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 px-3 text-xs">
                          <option value="">— Aucune —</option>
                          {zones.map((z: any) => <option key={z.id} value={z.id}>{z.zoneName}</option>)}
                        </select>
                      </div>
                    )}
                    <p className="md:col-span-3 text-[10px] text-slate-400">
                      Position posée : {pendingPoint.lat.toFixed(5)}, {pendingPoint.lng.toFixed(5)}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    Aucun point sélectionné — cliquez sur la carte ci-dessus.
                  </p>
                )
              ) : isDrawing ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={undoLastPoint} disabled={drawingPoints.length === 0} className="h-9 text-[10px] font-bold uppercase">
                      <Undo2 className="w-3.5 h-3.5 mr-1.5" /> Annuler le dernier point
                    </Button>
                    <Button variant="outline" onClick={cancelDrawing} className="h-9 text-[10px] font-bold uppercase text-red-500 border-red-200">
                      <X className="w-3.5 h-3.5 mr-1.5" /> Annuler le tracé
                    </Button>
                  </div>
                  {drawingPoints.length >= 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-end pt-2 border-t border-slate-100">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Zone existante ou nouveau nom</Label>
                        <div className="flex gap-2">
                          {zones && zones.length > 0 && (
                            <select
                              value={selectedExistingZoneId}
                              onChange={(e) => { setSelectedExistingZoneId(e.target.value); setNewZoneName(''); }}
                              className="h-9 flex-1 rounded-md border border-slate-200 px-2 text-xs"
                            >
                              <option value="">— Nouvelle zone —</option>
                              {zones.map((z: any) => <option key={z.id} value={z.id}>{z.zoneName}</option>)}
                            </select>
                          )}
                          {!selectedExistingZoneId && (
                            <Input
                              value={newZoneName}
                              onChange={(e) => setNewZoneName(e.target.value)}
                              placeholder="Ex: Tié-Tié"
                              className="h-9 text-xs flex-1"
                            />
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={handleSaveZoneBoundary}
                        disabled={saveZoneBoundary.isPending || createZone.isPending}
                        className="h-9 bg-fiatlux-primary text-white text-[10px] font-bold uppercase px-4"
                      >
                        {saveZoneBoundary.isPending || createZone.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1.5" /> Terminer le contour</>}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-2">
                  Cliquez sur &quot;Nouvelle zone&quot; puis posez au moins 3 points sur la carte pour dessiner un contour.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}