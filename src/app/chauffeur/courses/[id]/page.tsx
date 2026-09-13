'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Phone, Package, Banknote, CheckCircle2, Clock, ArrowLeft, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { ChauffeurLayout } from '@/components/layout/chauffeur-layout';
import { useMyOrder } from '@/hooks/use-rider-portal';
import { RiderPortalService, getCurrentPositionWithReason, geoErrorMessage } from '@/services/rider-portal.service';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

// Import dynamique (SSR désactivé) — même pattern que les cartes admin et
// client, react-leaflet ne peut pas être rendu côté serveur.
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  ASSIGNED: 'Assignée',
  ACCEPTED: 'Acceptée',
  EN_ROUTE_TO_PICKUP: 'En route vers collecte',
  AT_PICKUP: 'Arrivé à la collecte',
  PICKED_UP: 'Colis récupéré',
  IN_TRANSIT: 'En livraison',
  AT_DROPOFF: 'Arrivé à la livraison',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
  FAILED: 'Échec',
};

export default function ChauffeurCourseDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: order, isLoading } = useMyOrder(id);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [L, setL] = React.useState<any>(null);

  React.useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet);
      // @ts-ignore — fix l'icône par défaut cassée par le bundling Next.js
      delete leaflet.Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    });
  }, []);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['rider', 'my-order', id] });
    queryClient.invalidateQueries({ queryKey: ['rider', 'my-orders'] });
  };

  const runAction = async (fn: () => Promise<any>, successMsg: string) => {
    setActionLoading(true);
    try {
      await fn();
      toast.success(successMsg);
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setActionLoading(false);
    }
  };

  // Récupère la position et, en cas d'échec, avertit le chauffeur de la
  // VRAIE cause (permission refusée, HTTPS requis, GPS trop lent...) au lieu
  // de le laisser deviner. On ne bloque pas l'action ici : c'est le backend
  // qui décide si le GPS est obligatoire à cette étape précise (ex: "Position
  // GPS requise pour valider l'arrivée sur zone" à 100m du point de collecte/
  // livraison) — voir /api/admin/orders/[id]/status/route.ts.
  const resolvePosition = async (): Promise<{ lat: number; lng: number } | undefined> => {
    const geo = await getCurrentPositionWithReason();
    if (!geo.ok) {
      toast(geoErrorMessage(geo.reason));
      return undefined;
    }
    return geo.position;
  };

  // Le bouton "Je suis arrivé à la collecte" couvre volontairement 3 statuts
  // (ASSIGNED, ACCEPTED, EN_ROUTE_TO_PICKUP) pour n'afficher qu'une seule
  // action au chauffeur. Mais la state machine backend (order-state-machine.ts)
  // interdit de sauter directement à AT_PICKUP depuis ASSIGNED ou ACCEPTED :
  // il faut passer par chaque étape intermédiaire. On les enchaîne donc ici,
  // dans l'ordre, avant d'envoyer le statut final.
  const handleArrivedAtPickup = () => runAction(async () => {
    const pos = await resolvePosition();
    const sequence: Record<string, string[]> = {
      ASSIGNED: ['ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'AT_PICKUP'],
      ACCEPTED: ['EN_ROUTE_TO_PICKUP', 'AT_PICKUP'],
      EN_ROUTE_TO_PICKUP: ['AT_PICKUP'],
    };
    const steps = sequence[order.status] || ['AT_PICKUP'];
    let result;
    for (const step of steps) {
      result = await RiderPortalService.updateOrderStatus(id, step, pos?.lat, pos?.lng);
    }
    return result;
  }, 'Arrivée à la collecte enregistrée');

  const handlePickedUp = () => runAction(async () => {
    const pos = await resolvePosition();
    return RiderPortalService.updateOrderStatus(id, 'PICKED_UP', pos?.lat, pos?.lng);
  }, 'Colis récupéré');

  // Même logique que handleArrivedAtPickup ci-dessus : le bouton "Je suis
  // arrivé à la livraison" est visible dès PICKED_UP, mais la state machine
  // backend (order-state-machine.ts) n'autorise PICKED_UP qu'à passer par
  // IN_TRANSIT — jamais directement à AT_DROPOFF. Sans cet enchaînement, un
  // clic depuis PICKED_UP était silencieusement rejeté par le serveur
  // (transition invalide, HTTP 409) : le chauffeur croyait avoir validé son
  // arrivée, mais rien n'était enregistré et le client ne voyait jamais rien
  // changer côté suivi.
  const handleArrivedAtDropoff = () => runAction(async () => {
    const pos = await resolvePosition();
    const sequence: Record<string, string[]> = {
      PICKED_UP: ['IN_TRANSIT', 'AT_DROPOFF'],
      IN_TRANSIT: ['AT_DROPOFF'],
    };
    const steps = sequence[order.status] || ['AT_DROPOFF'];
    let result;
    for (const step of steps) {
      result = await RiderPortalService.updateOrderStatus(id, step, pos?.lat, pos?.lng);
    }
    return result;
  }, 'Arrivée à la livraison enregistrée');

  const handleDelivered = () => runAction(async () => {
    const pos = await resolvePosition();
    return RiderPortalService.updateOrderStatus(id, 'DELIVERED', pos?.lat, pos?.lng);
  }, 'Livraison terminée !');

  const handleCashReceived = () => runAction(async () => {
    const pos = await resolvePosition();
    return RiderPortalService.confirmCashReceived(id, pos?.lat, pos?.lng);
  }, 'Paiement en espèces confirmé');

  if (isLoading) {
    return (
      <ChauffeurLayout>
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-fiatlux-primary" />
        </div>
      </ChauffeurLayout>
    );
  }

  if (!order) {
    return (
      <ChauffeurLayout>
        <div className="text-center py-16">
          <p className="text-sm text-slate-400">Course introuvable.</p>
        </div>
      </ChauffeurLayout>
    );
  }

  const confirmations = order.confirmations || [];
  // Étape en cours : tant que le colis n'est pas récupéré, le chauffeur va
  // vers la collecte ; ensuite vers la livraison. Sert à mettre en avant le
  // bon bouton "Y aller" plutôt que de laisser les deux avec le même poids.
  const isPickupLeg = !['PICKED_UP', 'IN_TRANSIT', 'AT_DROPOFF', 'DELIVERED'].includes(order.status);
  const senderConfirmedPickup = confirmations.some((c: any) => c.step === 'PICKUP' && c.actor === 'SENDER' && c.action === 'CONFIRMED');
  // Commande "Moi-même" en mode AUTO : pas de tiers pour confirmer la
  // collecte, le client a choisi de laisser la main à l'app (le blocage GPS
  // à 100m fait déjà office de vérification côté serveur).
  const isSelfAutoPickup = order.deliveryType === 'SELF' && order.pickupControlMode === 'AUTO';
  const canProceedAfterPickup = senderConfirmedPickup || isSelfAutoPickup;
  const recipientConfirmedDropoff = confirmations.some((c: any) => c.step === 'DROPOFF' && c.actor === 'RECIPIENT' && c.action === 'CONFIRMED');
  const cashConfirmedByPayer = confirmations.some((c: any) => c.step === 'CASH_PAYMENT' && c.action === 'CONFIRMED' && (c.actor === 'SENDER' || c.actor === 'RECIPIENT'));
  const cashConfirmedByRider = confirmations.some((c: any) => c.step === 'CASH_PAYMENT' && c.actor === 'RIDER' && c.action === 'CONFIRMED');

  const isCash = order.paymentMethod?.startsWith('CASH');

  // Cohérence : si des espèces sont dues à cette étape précise, le chauffeur
  // ne doit pas pouvoir avancer (récupérer le colis / clôturer la livraison)
  // tant qu'il n'a pas explicitement cliqué "J'ai reçu l'argent" — sinon
  // l'étape paiement est simplement sautée, jamais vraiment confirmée.
  const cashSettledForPickup = order.paymentMethod !== 'CASH_AT_PICKUP' || cashConfirmedByRider;
  const cashSettledForDelivery = order.paymentMethod !== 'CASH_AT_DELIVERY' || cashConfirmedByRider;

  return (
    <ChauffeurLayout>
      <div className="space-y-5">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour
        </button>

        <div>
          <div className="flex items-center justify-between">
            <h1 className="font-mono text-sm font-black text-slate-900">{order.trackingNumber}</h1>
            <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-fiatlux-primary/10 text-fiatlux-primary">
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
        </div>

        {/* Carte intégrée : trajet OSRM déjà calculé à la création de la
            commande, mêmes données que les pages admin et client. Tout reste
            dans l'app — pas de redirection vers une appli tierce. */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden h-56">
          {L && order.pickupLat && order.dropoffLat && (() => {
            const routeCoords: [number, number][] =
              order.routeGeoJson?.coordinates?.map((c: [number, number]) => [c[1], c[0]]) || [];
            const hasRoute = routeCoords.length > 1;
            const activeIcon = L.divIcon({
              className: 'custom-div-icon',
              html: `<div style="background:${isPickupLeg ? '#f59e0b' : '#0d4270'};width:20px;height:20px;border-radius:50%;box-shadow:0 0 0 4px ${isPickupLeg ? 'rgba(245,158,11,.25)' : 'rgba(13,66,112,.25)'}, 0 0 0 2px white;"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            });
            const dimIcon = L.divIcon({
              className: 'custom-div-icon',
              html: `<div style="background:#cbd5e1;width:14px;height:14px;border-radius:50%;box-shadow:0 0 0 2px white;"></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            });
            return (
              <MapContainer
                bounds={[[order.pickupLat, order.pickupLng], [order.dropoffLat, order.dropoffLng], ...routeCoords] as any}
                boundsOptions={{ padding: [30, 30] }}
                className="h-full w-full"
                scrollWheelZoom={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Polyline
                  positions={hasRoute ? routeCoords : [[order.pickupLat, order.pickupLng], [order.dropoffLat, order.dropoffLng]]}
                  pathOptions={{ color: '#0F4C81', weight: 4, opacity: hasRoute ? 0.85 : 0.4, dashArray: hasRoute ? undefined : '6,8' }}
                />
                <Marker position={[order.pickupLat, order.pickupLng]} icon={isPickupLeg ? activeIcon : dimIcon} />
                <Marker position={[order.dropoffLat, order.dropoffLng]} icon={!isPickupLeg ? activeIcon : dimIcon} />
              </MapContainer>
            );
          })()}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Collecte</p>
              <p className="text-xs font-bold text-slate-800">{order.pickupAddress}</p>
              {order.pickupLandmark && <p className="text-[10px] text-slate-400 italic">{order.pickupLandmark}</p>}
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${order.pickupLat},${order.pickupLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-slate-300"
              title="Ouvrir dans une appli de navigation externe"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-fiatlux-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Livraison</p>
              <p className="text-xs font-bold text-slate-800">{order.dropoffAddress}</p>
              {order.dropoffLandmark && <p className="text-[10px] text-slate-400 italic">{order.dropoffLandmark}</p>}
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${order.dropoffLat},${order.dropoffLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-slate-300"
              title="Ouvrir dans une appli de navigation externe"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          {order.packageDescription && (
            <div className="flex items-start gap-2 pt-2 border-t border-slate-50">
              <Package className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">{order.packageDescription}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Expéditeur</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{order.customer?.name || order.guestCustomerName || 'N/A'}</p>
            {(order.customer?.phone || order.guestCustomerPhone) && (
              <a href={`tel:${order.customer?.phone || order.guestCustomerPhone}`} className="flex items-center gap-1 text-[10px] text-fiatlux-primary font-bold mt-1">
                <Phone className="w-3 h-3" /> Appeler
              </a>
            )}
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Destinataire</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{order.recipientName || 'N/A'}</p>
            {order.recipientPhone && (
              <a href={`tel:${order.recipientPhone}`} className="flex items-center gap-1 text-[10px] text-fiatlux-primary font-bold mt-1">
                <Phone className="w-3 h-3" /> Appeler
              </a>
            )}
          </div>
        </div>

        {isCash && (
          <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-white/60" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Espèces</span>
            </div>
            <span className="text-sm font-black text-white">{order.amount?.toLocaleString()} FCFA</span>
          </div>
        )}

        {/* Actions selon le statut, séquentielles */}
        <div className="space-y-2 pb-4">
          {['ASSIGNED', 'ACCEPTED', 'EN_ROUTE_TO_PICKUP'].includes(order.status) && (
            <Button onClick={handleArrivedAtPickup} disabled={actionLoading} className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-wider text-xs">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Je suis arrivé à la collecte"}
            </Button>
          )}

          {order.status === 'AT_PICKUP' && (
            <>
              {order.paymentMethod === 'CASH_AT_PICKUP' && canProceedAfterPickup && (
                cashConfirmedByRider ? null : cashConfirmedByPayer ? (
                  <Button onClick={handleCashReceived} disabled={actionLoading} className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider text-xs">
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "J'ai reçu l'argent"}
                  </Button>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-[11px] font-bold text-slate-500">En attente du paiement de l'expéditeur</p>
                  </div>
                )
              )}
              {!canProceedAfterPickup ? (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                  <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-amber-700">En attente de la confirmation de l'expéditeur</p>
                  <p className="text-[10px] text-amber-600 mt-1">Demandez-lui de confirmer via son lien de suivi</p>
                </div>
              ) : !cashSettledForPickup ? (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                  <Banknote className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-amber-700">Confirmez d'abord avoir reçu l'argent ci-dessus</p>
                </div>
              ) : (
                <Button onClick={handlePickedUp} disabled={actionLoading} className="w-full h-14 bg-fiatlux-primary hover:bg-[#0d4270] text-white font-black uppercase tracking-wider text-xs">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "J'ai récupéré le colis"}
                </Button>
              )}
            </>
          )}

          {['PICKED_UP', 'IN_TRANSIT'].includes(order.status) && (
            <Button onClick={handleArrivedAtDropoff} disabled={actionLoading} className="w-full h-14 bg-fiatlux-primary hover:bg-[#0d4270] text-white font-black uppercase tracking-wider text-xs">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Je suis arrivé à la livraison"}
            </Button>
          )}

          {order.status === 'AT_DROPOFF' && (
            <>
              {order.paymentMethod === 'CASH_AT_DELIVERY' && (
                cashConfirmedByRider ? null : cashConfirmedByPayer ? (
                  <Button onClick={handleCashReceived} disabled={actionLoading} className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider text-xs">
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "J'ai reçu l'argent"}
                  </Button>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-[11px] font-bold text-slate-500">En attente du paiement du destinataire</p>
                  </div>
                )
              )}
              {!recipientConfirmedDropoff ? (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                  <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-amber-700">En attente de la confirmation du destinataire</p>
                  <p className="text-[10px] text-amber-600 mt-1">Demandez-lui de confirmer via son lien de suivi</p>
                </div>
              ) : !cashSettledForDelivery ? (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                  <Banknote className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-amber-700">Confirmez d'abord avoir reçu l'argent ci-dessus</p>
                </div>
              ) : (
                <Button onClick={handleDelivered} disabled={actionLoading} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer la livraison"}
                </Button>
              )}
            </>
          )}

          {order.status === 'DELIVERED' && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="text-sm font-bold text-emerald-700">Course terminée</p>
            </div>
          )}
        </div>
      </div>
    </ChauffeurLayout>
  );
}