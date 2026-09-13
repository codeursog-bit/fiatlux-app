'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bike, 
  MapPin, 
  Package, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Navigation,
  Loader2,
  ShieldAlert,
  Wallet,
  XCircle,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useTracking } from '@/hooks/use-tracking';
import { haversineDistanceMeters } from '@/lib/geo';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';

// Dynamic Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

const STATUS_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
  PENDING: { label: 'En attente', color: 'bg-neutral-500', icon: Clock },
  ASSIGNED: { label: 'Livreur assigné', color: 'bg-blue-500', icon: Bike },
  ACCEPTED: { label: 'Confirmé', color: 'bg-blue-600', icon: CheckCircle2 },
  EN_ROUTE_TO_PICKUP: { label: 'Chauffeur en route', color: 'bg-amber-500', icon: Navigation },
  AT_PICKUP: { label: 'Chauffeur arrivé', color: 'bg-orange-500', icon: MapPin },
  PICKED_UP: { label: 'Colis récupéré', color: 'bg-emerald-500', icon: Package },
  IN_TRANSIT: { label: 'En livraison', color: 'bg-emerald-600', icon: Bike },
  AT_DROPOFF: { label: 'Chauffeur à destination', color: 'bg-orange-600', icon: MapPin },
  DELIVERED: { label: 'Livré', color: 'bg-emerald-700', icon: CheckCircle2 },
  CANCELLED: { label: 'Annulée', color: 'bg-red-500', icon: AlertCircle },
};

export default function TrackingPage() {
  const { token } = useParams();
  const { data, isLoading, error } = useTracking(token as string);
  const queryClient = useQueryClient();
  const [L, setL] = React.useState<any>(null);

  // Tous les hooks doivent être déclarés ici, AVANT les `return`
  // conditionnels ci-dessous — sinon React appelle un nombre différent
  // de hooks selon que la commande est chargée ou non, ce qui casse
  // les règles des Hooks (erreur "change in the order of Hooks").
  const [cancelReason, setCancelReason] = React.useState('');
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [review, setReview] = React.useState('');
  const [isSubmittingRating, setIsSubmittingRating] = React.useState(false);
  const [hasSubmittedRating, setHasSubmittedRating] = React.useState(false);

  React.useEffect(() => {
    import('leaflet').then((leaflet) => {
      // @ts-ignore
      delete leaflet.Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
      setL(leaflet);
    });
  }, []);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="h-10 w-10 animate-spin text-fiatlux-primary" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-black mb-2">Lien invalide</h1>
      <p className="text-neutral-500 mb-6">Ce lien de suivi n'est plus valide ou a expiré.</p>
      <Button onClick={() => window.location.href = '/'}>Retour à l'accueil</Button>
    </div>
  );

  const { order, role, canConfirm, alreadyConfirmedPackage, alreadyConfirmedCash, hasOpenDispute } = data as any;
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;

  const handleConfirmation = async (type: 'PACKAGE' | 'CASH_PAYMENT') => {
    setIsConfirming(true);
    try {
      // Position best-effort : n'empêche jamais la confirmation si le
      // navigateur refuse ou ne supporte pas la géolocalisation.
      const position = await new Promise<{ lat?: number; lng?: number }>((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          resolve({});
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({}),
          { timeout: 5000 }
        );
      });

      const res = await fetch(`/api/public/tracking/${token}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: type === 'CASH_PAYMENT' ? 'CASH_PAYMENT' : undefined,
          lat: position.lat,
          lng: position.lng,
        }),
      });

      if (res.ok) {
        toast.success(
          type === 'CASH_PAYMENT'
            ? 'Paiement confirmé, en attente du chauffeur'
            : 'Confirmation enregistrée, en attente du chauffeur'
        );
        queryClient.invalidateQueries({ queryKey: ['tracking', token] });
      } else {
        const err = await res.json();
        toast.error(err.error || 'La confirmation n\'a pas pu être enregistrée');
      }
    } catch (err) {
      toast.error('Erreur serveur');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/public/tracking/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (res.ok) {
        toast.success('Commande annulée avec succès');
        setShowCancelDialog(false);
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'annulation");
      }
    } catch (err) {
      toast.error("Erreur serveur");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRate = async () => {
    if (rating === 0) {
      toast.error('Veuillez sélectionner une note.');
      return;
    }
    setIsSubmittingRating(true);
    try {
      const res = await fetch(`/api/public/tracking/${token}/rate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review }),
      });

      if (res.ok) {
        setHasSubmittedRating(true);
        toast.success('Merci pour votre avis !');
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'envoi de la note");
      }
    } catch (err) {
      toast.error("Erreur serveur");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const isDisputed = !!hasOpenDispute;
  const isCancellable = role === 'SENDER' && ['PENDING', 'ASSIGNED', 'ACCEPTED'].includes(order.status);
  // Livraison "pour soi-même" : un seul lien existe, sa personne doit donc
  // pouvoir déclencher les actions des DEUX rôles (remise ET réception)
  // selon l'étape en cours — pas seulement celle du rôle enregistré sur
  // son lien.
  const isSelfDelivery = order.deliveryType === 'SELF';
  const actsAsSender = role === 'SENDER' || isSelfDelivery;
  const actsAsRecipient = role === 'RECIPIENT' || isSelfDelivery;

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 pt-8 pb-6 border-b rounded-b-[40px] shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Commande</p>
            <h1 className="text-xl font-black text-neutral-900">{order.trackingNumber}</h1>
          </div>
          <Badge className={cn("px-4 py-1.5 rounded-full font-black italic", status.color)}>
            {status.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-neutral-500 bg-neutral-50 p-3 rounded-2xl">
          <Package className="h-5 w-5 text-fiatlux-primary" />
          <p className="text-sm font-bold truncate">{order.packageDescription}</p>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6">
        {/* Alerts */}
        <AnimatePresence>
          {isDisputed && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border-2 border-red-100 p-4 rounded-3xl flex items-start gap-3"
            >
              <ShieldAlert className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-black text-red-900">Litige en cours</p>
                <p className="text-xs text-red-700 mt-1">Un agent FIATLUX va vous contacter pour vérifier la transaction.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suivi en direct — n'a de sens que tant que la commande est en
            cours ; une fois livrée/annulée, il n'y a plus rien à suivre en
            direct, on montre un récap à la place. */}
        {!['DELIVERED', 'CANCELLED'].includes(order.status) ? (
          <>
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Suivi en direct</h2>
          {order.rider?.currentLat != null && order.rider?.currentLng != null && (
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">En direct</span>
            </div>
          )}
        </div>

        <Card className="rounded-[32px] border-0 shadow-xl shadow-neutral-200 overflow-hidden w-full h-[340px] relative">
          {L && (() => {
            // GeoJSON OSRM = [lng, lat] ; Leaflet attend [lat, lng] — on
            // reconvertit ici, ne jamais mélanger les deux ordres.
            const routeCoords: [number, number][] =
              order.routeGeoJson?.coordinates?.map((c: [number, number]) => [c[1], c[0]]) || [];

            const hasRiderPos = order.rider?.currentLat != null && order.rider?.currentLng != null;

            // Le point de collecte/livraison ne suffit pas : si le chauffeur
            // n'est pas cadré aussi, son marqueur existe mais reste hors-champ
            // (bug d'origine — l'app ne "montrait rien" alors que la donnée
            // était bien là, juste invisible). On l'inclut toujours dans le
            // cadrage automatique.
            const allPoints: [number, number][] = [
              [order.pickupLat, order.pickupLng],
              [order.dropoffLat, order.dropoffLng],
              ...routeCoords,
              ...(hasRiderPos ? [[order.rider.currentLat, order.rider.currentLng] as [number, number]] : []),
            ];

            const pickupIcon = L.divIcon({
              className: 'custom-div-icon',
              html: `<div style="background:#f97316;width:16px;height:16px;border-radius:50%;box-shadow:0 0 0 3px rgba(249,115,22,.3), 0 0 0 2px white;"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            });
            const dropoffIcon = L.divIcon({
              className: 'custom-div-icon',
              html: `<div style="background:#10b981;width:16px;height:16px;border-radius:50%;box-shadow:0 0 0 3px rgba(16,185,129,.3), 0 0 0 2px white;"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            });
            const riderIcon = L.divIcon({
              className: 'custom-div-icon',
              html: `<div style="background:#0d4270;width:24px;height:24px;border-radius:50%;box-shadow:0 0 0 6px rgba(13,66,112,.2), 0 0 0 2px white;display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;background:white;border-radius:50%;"></div></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });

            return (
              <MapContainer
                bounds={allPoints as any}
                boundsOptions={{ padding: [48, 48] }}
                className="h-full w-full"
                zoomControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {routeCoords.length > 0 && (
                  <Polyline positions={routeCoords} pathOptions={{ color: '#0F4C81', weight: 4, opacity: 0.8 }} />
                )}
                <Marker position={[order.pickupLat, order.pickupLng]} icon={pickupIcon}>
                  <Popup>Point de collecte</Popup>
                </Marker>
                <Marker position={[order.dropoffLat, order.dropoffLng]} icon={dropoffIcon}>
                  <Popup>Destination</Popup>
                </Marker>
                {hasRiderPos && (
                  <Marker position={[order.rider.currentLat, order.rider.currentLng]} icon={riderIcon}>
                    <Popup>Position du livreur</Popup>
                  </Marker>
                )}
              </MapContainer>
            );
          })()}
          <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
             <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border shadow-sm flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Collecte</span>
             </div>
             <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border shadow-sm flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Livraison</span>
             </div>
          </div>
          {order.rider?.currentLat != null && order.rider?.currentLng != null ? (() => {
            // Même cible que côté admin : collecte tant que le colis n'est
            // pas récupéré, sinon livraison. Se met à jour à chaque refetch
            // (10s) pour que le client voie vraiment le chauffeur avancer.
            const beforePickup = !['PICKED_UP', 'IN_TRANSIT', 'AT_DROPOFF', 'DELIVERED'].includes(order.status);
            const targetLat = beforePickup ? order.pickupLat : order.dropoffLat;
            const targetLng = beforePickup ? order.pickupLng : order.dropoffLng;
            const distance = haversineDistanceMeters(order.rider.currentLat, order.rider.currentLng, targetLat, targetLng);
            const label = distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`;
            return (
              <div className="absolute bottom-0 inset-x-0 z-[1000] bg-fiatlux-primary/95 backdrop-blur px-5 py-3 flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-white animate-pulse shrink-0" />
                <p className="text-xs font-black text-white uppercase tracking-wide">
                  Chauffeur à {label} {beforePickup ? 'de la collecte' : 'de la livraison'}
                </p>
              </div>
            );
          })() : (
            <div className="absolute bottom-0 inset-x-0 z-[1000] bg-neutral-900/85 backdrop-blur px-5 py-3 flex items-center gap-2.5">
              <Clock className="w-3.5 h-3.5 text-white/70 shrink-0" />
              <p className="text-xs font-bold text-white/90">En attente de la position du chauffeur…</p>
            </div>
          )}
        </Card>
          </>
        ) : (
          <div className={cn(
            "rounded-[32px] p-6 flex items-center gap-4",
            order.status === 'DELIVERED' ? "bg-emerald-50 border border-emerald-100" : "bg-neutral-100 border border-neutral-200"
          )}>
            {order.status === 'DELIVERED' ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="w-10 h-10 text-neutral-400 shrink-0" />
            )}
            <div>
              <p className={cn("font-black", order.status === 'DELIVERED' ? "text-emerald-900" : "text-neutral-700")}>
                {order.status === 'DELIVERED' ? 'Livraison terminée' : 'Commande annulée'}
              </p>
              <p className="text-sm text-neutral-500 mt-0.5">
                {order.status === 'DELIVERED'
                  ? `Livré de ${order.pickupAddress} à ${order.dropoffAddress}.`
                  : "Cette commande a été annulée."}
              </p>
            </div>
          </div>
        )}

        {/* Action Zone */}
        <div className="space-y-4">
          {/* Conditional Actions */}
          {(actsAsSender && order.status === 'AT_PICKUP') && (
            <Card className="rounded-[40px] border-2 border-fiatlux-primary bg-blue-50 shadow-xl shadow-blue-100 overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Le chauffeur est là !</h3>
                  <p className="text-sm text-neutral-600 mt-2 font-medium">
                    Confirmez la remise du colis uniquement une fois que le livreur l'a physiquement récupéré.
                  </p>
                </div>
                {alreadyConfirmedPackage ? (
                  <div className="bg-white/60 rounded-2xl p-4 text-center flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 text-fiatlux-primary" />
                    <span className="text-sm font-bold text-neutral-600">En attente de la confirmation du chauffeur...</span>
                  </div>
                ) : (
                  <Button onClick={() => handleConfirmation('PACKAGE')} disabled={isConfirming} className="w-full h-16 rounded-2xl text-xl font-bold shadow-lg shadow-blue-200">
                    {isConfirming ? <Loader2 className="h-5 w-5 animate-spin" /> : "J'ai remis le colis"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {(actsAsRecipient && order.status === 'AT_DROPOFF') && (
            <Card className="rounded-[40px] border-2 border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-100 overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Livraison en cours</h3>
                  <p className="text-sm text-neutral-600 mt-2 font-medium">
                    Le livreur est à votre porte. Vérifiez l'état du colis avant de confirmer.
                  </p>
                </div>
                {alreadyConfirmedPackage ? (
                  <div className="bg-white/60 rounded-2xl p-4 text-center flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-bold text-neutral-600">En attente de la confirmation du chauffeur...</span>
                  </div>
                ) : (
                  <Button onClick={() => handleConfirmation('PACKAGE')} disabled={isConfirming} className="w-full h-16 rounded-2xl text-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200">
                    {isConfirming ? <Loader2 className="h-5 w-5 animate-spin" /> : "J'ai reçu le colis"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Action */}
          {(((actsAsSender) && order.cashPaymentSubtype === 'SENDER_PAYS' && order.status === 'AT_PICKUP') || 
            (actsAsRecipient && order.cashPaymentSubtype === 'RECIPIENT_PAYS' && order.status === 'AT_DROPOFF')) && (
            <div className="bg-orange-50 border-2 border-orange-100 rounded-[40px] p-6 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-orange-700">
                <Wallet className="h-5 w-5" />
                <span className="font-black uppercase tracking-widest text-xs">Paiement espèces</span>
              </div>
              <p className="text-lg font-black text-neutral-900">Total : {order.amount.toLocaleString()} FCFA</p>
              {alreadyConfirmedCash ? (
                <div className="bg-white/60 rounded-2xl p-3 text-center flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-bold text-neutral-600">En attente de la confirmation du chauffeur...</span>
                </div>
              ) : (
                <Button variant="outline" onClick={() => handleConfirmation('CASH_PAYMENT')} disabled={isConfirming} className="w-full h-14 rounded-2xl border-2 border-orange-200 text-orange-700 font-bold hover:bg-orange-100">
                  {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "J'ai payé le livreur"}
                </Button>
              )}
            </div>
          )}

          {/* Fallback Message */}
          {!( (actsAsSender && order.status === 'AT_PICKUP') || (actsAsRecipient && order.status === 'AT_DROPOFF') || ['DELIVERED', 'CANCELLED'].includes(order.status) ) && (
            <div className="text-center p-8 bg-white rounded-[40px] border border-neutral-100">
              <Clock className="h-10 w-10 text-neutral-300 mx-auto mb-4" />
              <h3 className="font-black text-neutral-900">En attente</h3>
              <p className="text-sm text-neutral-400 mt-1">
                {order.status === 'PENDING' || order.status === 'ASSIGNED' || order.status === 'ACCEPTED' || order.status === 'EN_ROUTE_TO_PICKUP' 
                  ? "Le chauffeur n'est pas encore arrivé au point de collecte."
                  : "Votre colis est en cours d'acheminement."}
              </p>
            </div>
          )}

          {/* Cancellation Option for Sender */}
          {isCancellable && (
            <div className="flex justify-center pt-2">
              <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="text-neutral-400 text-[10px] font-black uppercase tracking-widest hover:text-red-500 hover:bg-red-50 rounded-xl px-6">
                    Annuler la commande
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[32px] sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black italic">Annuler la commande ?</DialogTitle>
                    <DialogDescription className="font-medium text-neutral-500">
                      Cette action est irréversible. Le livreur sera immédiatement notifié.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Raison de l'annulation (optionnel)</label>
                      <Textarea 
                        placeholder="Ex: Changement d'avis, Erreur d'adresse..." 
                        className="rounded-2xl border-slate-100 focus:border-red-200 focus:ring-red-50 min-h-[100px]"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="rounded-xl font-bold order-2 sm:order-1">
                      Conserver la commande
                    </Button>
                    <Button 
                      onClick={handleCancel} 
                      disabled={isCancelling}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-widest order-1 sm:order-2"
                    >
                      {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer l'annulation"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-6 pt-4">
          <h4 className="text-sm font-black uppercase tracking-widest text-neutral-400 px-2">Suivi détaillé</h4>
          <div className="space-y-8 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
            {order.statusHistory.slice(0, 4).map((h: any, i: number) => {
              const cfg = STATUS_CONFIG[h.status] || STATUS_CONFIG.PENDING;
              return (
                <div key={h.id} className="relative pl-14">
                  <div className={cn(
                    "absolute left-3.5 -translate-x-1/2 w-5 h-5 rounded-full border-4 border-neutral-50 z-10",
                    i === 0 ? "bg-fiatlux-primary ring-4 ring-blue-100" : "bg-neutral-200"
                  )} />
                  <div>
                    <p className={cn("text-sm font-black italic tracking-tight", i === 0 ? "text-neutral-900" : "text-neutral-400")}>
                      {cfg.label}
                    </p>
                    <p className="text-[10px] font-bold text-neutral-400 mt-0.5">
                      {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

          {/* Rider Info & Rating */}
          {order.rider && (
            <div className="bg-neutral-900 text-white rounded-[40px] p-8 space-y-6">
              {/* Profile */}
              <div className="flex items-center gap-4">
                <div className="bg-neutral-800 h-14 w-14 rounded-2xl flex items-center justify-center">
                  <Bike className="h-8 w-8 text-fiatlux-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Livreur</p>
                  <p className="text-xl font-black italic">{order.rider.name.split(' ')[0]} {order.rider.name.split(' ')[1]?.[0]}.</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 text-amber-400 fill-current" />
                    <span className="text-[10px] font-black text-amber-400">{(order.rider.rating ?? 5).toFixed(1)}</span>
                    <span className="text-[10px] font-bold text-fiatlux-primary ml-2">{order.rider.vehiclePlate}</span>
                  </div>
                </div>
              </div>

              {/* Call Action - only if not delivered */}
              {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                <Link href={`tel:${order.rider.phone}`} className="block">
                  <Button className="w-full h-16 rounded-2xl bg-white text-neutral-900 hover:bg-neutral-100 text-lg font-bold gap-3">
                    <Phone className="h-6 w-6" /> Appeler le chauffeur
                  </Button>
                </Link>
              )}

              {/* Rating Section - Recipient only after delivery (or self-delivery, same person) */}
              {order.status === 'DELIVERED' && actsAsRecipient && !order.riderRating && !hasSubmittedRating && (
                <div className="pt-4 border-t border-neutral-800 space-y-6">
                  <div className="text-center">
                    <p className="text-sm font-black italic mb-4">Comment s'est passée votre livraison ?</p>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(star)}
                          className="p-1 transition-transform active:scale-90"
                        >
                          <Star 
                            className={cn(
                              "w-8 h-8 transition-colors",
                              (hoverRating || rating) >= star ? "text-amber-400 fill-current" : "text-neutral-700"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Commentaire (optionnel)</label>
                    <Textarea 
                      placeholder="Votre avis nous aide à nous améliorer..."
                      className="bg-neutral-800 border-neutral-700 text-white rounded-2xl focus:ring-amber-500 focus:border-amber-500"
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleRate}
                    disabled={isSubmittingRating || rating === 0}
                    className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-neutral-900 font-black uppercase tracking-widest"
                  >
                    {isSubmittingRating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Envoyer ma note"}
                  </Button>
                </div>
              )}

              {/* Thank you message */}
              {(order.riderRating || hasSubmittedRating) && actsAsRecipient && (
                <div className="pt-6 border-t border-neutral-800 text-center">
                  <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Merci pour votre avis !</span>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      <footer className="mt-12 pb-8 text-center px-8">
        <p className="text-[10px] text-neutral-300 font-bold uppercase tracking-[0.3em] mb-4">
          FIATLUX Security Protocol v2.4
        </p>
        <div className="flex items-center justify-center gap-1 text-[10px] text-neutral-400 font-medium">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Transactions protégées par double validation
        </div>
      </footer>
    </div>
  );
}