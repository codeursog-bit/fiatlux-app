'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useOrder, useAssignRider, useSetOrderAmount, useOrderClaims, useApproveClaim, useRejectClaim, useConfirmCashReceivedByAdmin, useUpdateOrderStatus } from '@/hooks/use-orders';
import { useRiders } from '@/hooks/use-riders';
import { haversineDistanceMeters } from '@/lib/geo';
import { isCancellable, canTransition } from '@/lib/order-state-machine';
import { ORDER_STATUS_LABELS } from '@/constants';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  ChevronRight,
  Package, 
  MapPin, 
  Phone, 
  User, 
  Truck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Camera,
  CreditCard,
  Banknote,
  ArrowRight,
  MoreVertical,
  Loader2,
  Map as MapIcon,
  RefreshCcw,
  Ban,
  Navigation,
  HandHeart,
  Copy,
  ExternalLink,
  MessageCircle,
  ShieldAlert
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { STATUS_COLORS } from '@/constants';
import { OrderStatus } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import 'leaflet/dist/leaflet.css';

// Dynamic Leaflet import
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: order, isLoading, error } = useOrder(id);
  const [L, setL] = React.useState<any>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [isAmountDialogOpen, setIsAmountDialogOpen] = React.useState(false);
  const [isCashConfirmDialogOpen, setIsCashConfirmDialogOpen] = React.useState(false);
  const [statusDialog, setStatusDialog] = React.useState<null | 'CANCELLED' | 'FAILED'>(null);
  const [statusReason, setStatusReason] = React.useState('');
  const assignRiderMutation = useAssignRider();
  const setAmountMutation = useSetOrderAmount();
  const confirmCashMutation = useConfirmCashReceivedByAdmin();
  const updateStatusMutation = useUpdateOrderStatus();
  const { data: claims } = useOrderClaims(id, !order?.rider);
  const approveClaimMutation = useApproveClaim();
  const rejectClaimMutation = useRejectClaim();
  const pendingClaims = React.useMemo(() => (claims || []).filter((c: any) => c.status === 'PENDING'), [claims]);
  const {
    data: activeRiders,
    isLoading: isLoadingNearest,
    isError: isNearestError,
  } = useRiders({ status: 'ACTIVE' });

  // Tri par distance réelle au point de collecte, calculée côté client
  // (Haversine) — ne dépend d'aucune extension PostGIS ni script SQL
  // exécuté à part : un livreur ACTIVE doit toujours pouvoir être assigné,
  // même si prisma/postgis.sql n'a jamais été lancé sur la base.
  const nearestRiders = React.useMemo(() => {
    if (!activeRiders || order?.pickupLat == null || order?.pickupLng == null) {
      return activeRiders?.map((r: any) => ({ ...r, distanceMeters: null })) || [];
    }
    return [...activeRiders]
      .map((r: any) => ({
        ...r,
        distanceMeters: r.currentLat != null && r.currentLng != null
          ? haversineDistanceMeters(order.pickupLat, order.pickupLng, r.currentLat, r.currentLng)
          : null,
      }))
      .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
  }, [activeRiders, order?.pickupLat, order?.pickupLng]);

  const handleAssignRider = async (riderId: string) => {
    try {
      await assignRiderMutation.mutateAsync({ orderId: id, riderId });
      toast.success('Livreur assigné à la commande.');
      setIsAssignDialogOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Impossible d'assigner ce livreur");
    }
  };

  const handleSetAmount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseInt(formData.get('amount') as string, 10);
    if (!amount || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    try {
      await setAmountMutation.mutateAsync({ orderId: id, amount });
      toast.success('Montant fixé pour cette commande.');
      setIsAmountDialogOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Impossible de fixer le montant');
    }
  };

  const handleApproveClaim = async (claimId: string) => {
    try {
      await approveClaimMutation.mutateAsync({ orderId: id, claimId });
      toast.success('Chauffeur validé — commande assignée.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Impossible de valider cette demande");
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    try {
      await rejectClaimMutation.mutateAsync({ orderId: id, claimId });
      toast.success('Demande refusée.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Impossible de refuser cette demande');
    }
  };

  const handleConfirmCash = async () => {
    try {
      await confirmCashMutation.mutateAsync(id);
      toast.success('Paiement en espèces confirmé.');
      setIsCashConfirmDialogOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Impossible de confirmer ce paiement');
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusDialog) return;
    try {
      await updateStatusMutation.mutateAsync({ id, status: statusDialog, note: statusReason.trim() || undefined });
      toast.success(statusDialog === 'CANCELLED' ? 'Commande annulée.' : 'Livraison marquée en échec.');
      setStatusDialog(null);
      setStatusReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Impossible de changer le statut de cette commande');
    }
  };

  const copyLink = (token: string, label: string) => {
    const url = `${window.location.origin}/suivi/${token}`;
    navigator.clipboard.writeText(url);
    toast.success(`${label} copié.`);
  };

  React.useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet);
      // Fix default icon issue
      // @ts-ignore
      delete leaflet.Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    });
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-fiatlux-primary" />
          <p className="text-sm font-medium text-slate-500">Chargement des détails de la commande...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !order) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Commande introuvable</h2>
          <p className="text-slate-500 mt-2 mb-6">La commande que vous recherchez n&apos;existe pas ou a été supprimée.</p>
          <Button onClick={() => router.push('/orders')} variant="outline">
            Retour aux commandes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'En attente';
      case OrderStatus.ASSIGNED: return 'Assigné';
      case OrderStatus.ACCEPTED: return 'Accepté';
      case OrderStatus.EN_ROUTE_TO_PICKUP: return 'En route pour enlèvement';
      case OrderStatus.AT_PICKUP: return 'À l\'enlèvement';
      case OrderStatus.PICKED_UP: return 'Récupéré';
      case OrderStatus.IN_TRANSIT: return 'En transit';
      case OrderStatus.AT_DROPOFF: return 'Au point de livraison';
      case OrderStatus.DELIVERED: return 'Livré';
      case OrderStatus.CANCELLED: return 'Annulé';
      case OrderStatus.FAILED: return 'Échoué';
      default: return status;
    }
  };

  // Le paiement espèces n'est pertinent qu'à partir du moment où le client a
  // lui-même confirmé avoir payé (côté /suivi) — avant ça, il n'y a rien à
  // "encaisser" et afficher une alerte orange dès la création de la
  // commande n'a pas de sens (voir remarque : "je vois ça avant même que la
  // course ne débute").
  const confirmations = order.confirmations || [];
  const clientConfirmedCash = confirmations.some(
    (c: any) => c.step === 'CASH_PAYMENT' && c.action === 'CONFIRMED' && (c.actor === 'SENDER' || c.actor === 'RECIPIENT')
  );
  const isCashOrder = order.paymentMethod === 'CASH_AT_PICKUP' || order.paymentMethod === 'CASH_AT_DELIVERY';

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => router.push('/orders')}
              className="h-9 w-9 rounded-full border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Commande <span className="text-fiatlux-primary">#{order.trackingNumber}</span>
                </h1>
                <Badge className={cn("text-[10px] px-2 py-0.5 rounded uppercase font-bold", STATUS_COLORS[order.status])}>
                  {getStatusLabel(order.status)}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Créée le {format(new Date(order.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={!isCancellable(order.status)}
              onClick={() => setStatusDialog('CANCELLED')}
              title={!isCancellable(order.status) ? "Cette commande ne peut plus être annulée à ce stade (colis déjà en cours de collecte)." : undefined}
              className="h-9 text-xs font-bold uppercase tracking-wider text-red-600 border-red-100 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Ban className="w-3.5 h-3.5 mr-2" />
              Annuler
            </Button>
            <Button
              variant="outline"
              disabled={!canTransition(order.status, OrderStatus.FAILED)}
              onClick={() => setStatusDialog('FAILED')}
              title={!canTransition(order.status, OrderStatus.FAILED) ? "L'échec de livraison ne s'applique qu'après la collecte du colis." : undefined}
              className="h-9 text-xs font-bold uppercase tracking-wider text-amber-600 border-amber-100 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <XCircle className="w-3.5 h-3.5 mr-2" />
              Échec livraison
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(buttonVariants(), "h-9 bg-fiatlux-primary hover:bg-[#0d4270] text-white font-bold uppercase tracking-wider text-xs px-6")}>
                Actions
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-slate-200 p-2 min-w-[240px]">
                {order.senderToken && (
                  <DropdownMenuItem onClick={() => copyLink(order.senderToken!, 'Lien de suivi (expéditeur)')} className="gap-2 font-bold text-xs p-3 rounded-lg">
                    <Copy className="w-4 h-4" /> Copier le lien expéditeur
                  </DropdownMenuItem>
                )}
                {order.recipientToken && order.deliveryType === 'THIRD_PARTY' && (
                  <DropdownMenuItem onClick={() => copyLink(order.recipientToken!, 'Lien de suivi (destinataire)')} className="gap-2 font-bold text-xs p-3 rounded-lg">
                    <Copy className="w-4 h-4" /> Copier le lien destinataire
                  </DropdownMenuItem>
                )}
                {order.senderToken && (
                  <DropdownMenuItem onClick={() => window.open(`/suivi/${order.senderToken}`, '_blank', 'noopener,noreferrer')} className="gap-2 font-bold text-xs p-3 rounded-lg">
                    <ExternalLink className="w-4 h-4" /> Ouvrir la page de suivi
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/disputes')} className="gap-2 font-bold text-xs p-3 rounded-lg">
                  <ShieldAlert className="w-4 h-4" /> Voir les litiges
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stakeholders & Map */}
          <div className="lg:col-span-2 space-y-8">
            {/* Parties prenantes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Expéditeur */}
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-fiatlux-primary" /> Expéditeur
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{order.customer?.name || order.guestCustomerName || 'N/A'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{order.guestCustomerPhone || 'N/A'}</p>
                    </div>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-slate-100">
                      <Phone className="w-3 h-3 text-slate-400" />
                    </Button>
                  </div>
                  <div className="pt-2 border-t border-slate-50">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-600 leading-relaxed">{order.pickupAddress}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Destinataire */}
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-fiatlux-primary" /> Destinataire
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{order.recipientName || 'Non spécifié'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{order.recipientPhone || 'N/A'}</p>
                    </div>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-slate-100">
                      <Phone className="w-3 h-3 text-slate-400" />
                    </Button>
                  </div>
                  <div className="pt-2 border-t border-slate-50">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-600 leading-relaxed">{order.dropoffAddress}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Livreur */}
              <Card className="border-slate-200 shadow-sm overflow-hidden md:col-span-2">
                <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-fiatlux-primary" /> Livreur Assigné
                  </CardTitle>
                  <Button
                    variant="outline"
                    onClick={() => setIsAssignDialogOpen(true)}
                    className="h-6 text-[9px] font-black uppercase tracking-wider px-2 border-slate-200"
                  >
                    <RefreshCcw className="w-2.5 h-2.5 mr-1" /> Réassigner
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  {order.rider ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm ring-1 ring-slate-100">
                          <AvatarFallback className="bg-slate-50 text-slate-400 font-bold">
                            {order.rider.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{order.rider.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">{order.rider.vehiclePlate}</span>
                            <span className="text-[10px] text-slate-400">•</span>
                            <span className="text-[10px] text-slate-500 font-medium">{order.rider.phone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" className="h-8 w-8 rounded-full">
                          <Phone className="w-3.5 h-3.5 text-fiatlux-primary" />
                        </Button>
                        <Button className="h-8 bg-slate-900 text-white text-[10px] font-bold uppercase px-4">
                          Message
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded-lg">
                      <p className="text-xs text-slate-400 font-medium italic">Aucun livreur assigné pour le moment.</p>
                      <Button
                        onClick={() => setIsAssignDialogOpen(true)}
                        className="mt-3 h-8 bg-fiatlux-primary text-white text-[10px] font-bold uppercase px-6"
                      >
                        Assigner un livreur
                      </Button>
                    </div>
                  )}

                  {/* Chauffeurs ayant demandé cette commande depuis leur app
                      (pris en route, avant validation admin) */}
                  {!order.rider && pendingClaims.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                        <HandHeart className="w-3 h-3" /> {pendingClaims.length} chauffeur{pendingClaims.length > 1 ? 's' : ''} intéressé{pendingClaims.length > 1 ? 's' : ''}
                      </p>
                      {pendingClaims.map((claim: any) => (
                        <div key={claim.id} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarFallback className="bg-white text-slate-400 font-bold text-[10px]">
                                {claim.rider.name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{claim.rider.name}</p>
                              <span className="text-[9px] text-slate-500 font-mono">{claim.rider.vehiclePlate}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              disabled={approveClaimMutation.isPending || rejectClaimMutation.isPending}
                              onClick={() => handleApproveClaim(claim.id)}
                              className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold uppercase px-2.5"
                            >
                              Accepter
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={approveClaimMutation.isPending || rejectClaimMutation.isPending}
                              onClick={() => handleRejectClaim(claim.id)}
                              className="h-7 text-[9px] font-bold uppercase px-2.5 border-slate-200 text-slate-500"
                            >
                              Refuser
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bloc Carte */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden h-[400px] flex flex-col">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-fiatlux-primary" />
                  <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Suivi d&apos;itinéraire</h2>
                </div>
                <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> <span>Collecte</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-fiatlux-primary"></span> <span>Livraison</span></div>
                </div>
              </div>
              {order.rider?.currentLat != null && order.rider?.currentLng != null && (() => {
                // Cible courante selon l'étape : le point de collecte tant que le
                // colis n'est pas récupéré, sinon le point de livraison. Se
                // recalcule à chaque refetch (toutes les 10s) pour donner une
                // vraie impression de rapprochement, pas juste un point figé.
                const beforePickup = !['PICKED_UP', 'IN_TRANSIT', 'AT_DROPOFF', 'DELIVERED'].includes(order.status);
                const targetLat = beforePickup ? order.pickupLat : order.dropoffLat;
                const targetLng = beforePickup ? order.pickupLng : order.dropoffLng;
                const distance = haversineDistanceMeters(order.rider.currentLat, order.rider.currentLng, targetLat, targetLng);
                const label = distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`;
                return (
                  <div className="px-5 py-2 bg-fiatlux-primary/5 border-b border-slate-200 flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 text-fiatlux-primary" />
                    <p className="text-[10px] font-bold text-fiatlux-primary">
                      Chauffeur à {label} {beforePickup ? 'du point de collecte' : 'du point de livraison'}
                    </p>
                  </div>
                );
              })()}
              <div className="flex-1 bg-slate-50">
                {(() => {
                  // Trajet routier réel (OSRM), calculé et stocké à la création
                  // de la commande — mêmes coordonnées [lng,lat] que sur la
                  // page de suivi client, à reconvertir en [lat,lng] pour Leaflet.
                  const routeCoords: [number, number][] =
                    order.routeGeoJson?.coordinates?.map((c: [number, number]) => [c[1], c[0]]) || [];
                  const hasRoute = routeCoords.length > 1;

                  return (
                    <MapContainer
                      center={[order.pickupLat, order.pickupLng]}
                      zoom={12}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[order.pickupLat, order.pickupLng]} />
                      <Marker position={[order.dropoffLat, order.dropoffLng]} />
                      <Polyline
                        positions={
                          hasRoute
                            ? routeCoords
                            : [
                                [order.pickupLat, order.pickupLng],
                                [order.dropoffLat, order.dropoffLng],
                              ]
                        }
                        color="#0d4270"
                        dashArray={hasRoute ? undefined : '5, 10'}
                        weight={hasRoute ? 4 : 2}
                      />
                      {order.rider?.currentLat != null && order.rider?.currentLng != null && (
                        <Marker
                          position={[order.rider.currentLat, order.rider.currentLng]}
                          icon={L ? L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div class="bg-fiatlux-primary text-white p-1.5 rounded-full shadow-lg ring-2 ring-white"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2V5h8v11Z"/><path d="M2 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.5"/><path d="M20.5 7H22a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1.5"/><path d="M3 5h18"/><path d="M3 19h18"/></svg></div>`,
                            iconSize: [28, 28],
                            iconAnchor: [14, 14]
                          }) : undefined}
                        />
                      )}
                    </MapContainer>
                  );
                })()}
              </div>
            </div>

            {/* Preuves */}
            <div className="grid grid-cols-1 gap-8">
              {/* Photos */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="py-4 border-b border-slate-50">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 text-fiatlux-primary" /> Photos de preuve
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Collecte</p>
                    {order.pickupPhotoUrl ? (
                      <div className="relative aspect-[4/3] rounded-md overflow-hidden ring-1 ring-slate-100">
                        <Image 
                          src={order.pickupPhotoUrl} 
                          alt="Collecte" 
                          fill 
                          className="object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] rounded-md border-2 border-dashed border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center text-slate-300">
                        <Camera className="w-6 h-6 mb-1 opacity-20" />
                        <span className="text-[10px] font-medium">Aucune photo</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Livraison</p>
                    {order.deliveryPhotoUrl ? (
                      <div className="relative aspect-[4/3] rounded-md overflow-hidden ring-1 ring-slate-100">
                        <Image 
                          src={order.deliveryPhotoUrl} 
                          alt="Livraison" 
                          fill 
                          className="object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] rounded-md border-2 border-dashed border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center text-slate-300">
                        <Camera className="w-6 h-6 mb-1 opacity-20" />
                        <span className="text-[10px] font-medium">Aucune photo</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column: Timeline & Payment */}
          <div className="space-y-8">
            {/* Timeline */}
            <Card className="border-slate-200 shadow-sm flex flex-col h-fit">
              <CardHeader className="py-4 border-b border-slate-50">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-fiatlux-primary" /> Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 relative">
                <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-100"></div>
                <div className="space-y-8">
                  {(() => {
                    // L'API renvoie l'historique du plus récent au plus ancien
                    // (utile pour "quel est le statut actuel ?"), mais une
                    // timeline se lit naturellement du plus ancien (en haut)
                    // au plus récent (en bas) — comme le reste du parcours de
                    // la commande. On inverse donc juste pour l'affichage.
                    const chronological = [...(order.statusHistory || [])].reverse();
                    const lastIdx = chronological.length - 1;

                    // Étapes futures : le parcours "heureux" d'une commande.
                    // IN_TRANSIT est volontairement absent (voir
                    // order-state-machine.ts : aucun bouton chauffeur n'y
                    // mène jamais). On n'affiche des étapes à venir que si la
                    // commande est encore en cours (pas annulée/échouée).
                    const HAPPY_PATH: OrderStatus[] = [
                      OrderStatus.PENDING, OrderStatus.ASSIGNED, OrderStatus.ACCEPTED,
                      OrderStatus.EN_ROUTE_TO_PICKUP, OrderStatus.AT_PICKUP, OrderStatus.PICKED_UP,
                      OrderStatus.AT_DROPOFF, OrderStatus.DELIVERED,
                    ];
                    const isTerminalStopped = order.status === OrderStatus.CANCELLED || order.status === OrderStatus.FAILED;
                    const currentIdxInPath = HAPPY_PATH.indexOf(order.status);
                    const upcomingSteps = isTerminalStopped || currentIdxInPath === -1
                      ? []
                      : HAPPY_PATH.slice(currentIdxInPath + 1);

                    return (
                      <>
                        {chronological.map((item, idx) => (
                          <div key={item.id ?? idx} className="relative pl-10">
                            <div className={cn(
                              "absolute left-[-4px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white shrink-0 z-10",
                              idx === lastIdx ? "bg-fiatlux-primary" : "bg-slate-300"
                            )}></div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-bold text-slate-900">{getStatusLabel(item.status)}</p>
                                <span className="text-[9px] font-mono text-slate-400">
                                  {format(new Date(item.createdAt), 'HH:mm')}
                                </span>
                              </div>
                              {item.note && (
                                <p className="text-[10px] text-slate-500 leading-relaxed italic">&quot;{item.note}&quot;</p>
                              )}
                              <p className="text-[9px] text-slate-400">
                                {format(new Date(item.createdAt), 'dd MMM yyyy', { locale: fr })}
                              </p>
                            </div>
                          </div>
                        ))}
                        {upcomingSteps.map((status) => (
                          <div key={status} className="relative pl-10 opacity-40">
                            <div className="absolute left-[-4px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white bg-slate-200 z-10"></div>
                            <p className="text-[11px] font-bold text-slate-500">{ORDER_STATUS_LABELS[status] || getStatusLabel(status)}</p>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Paiement */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-white opacity-50" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Paiement</span>
                </div>
                <Badge variant={order.paymentStatus === 'PAID' ? 'outline' : 'secondary'} className={cn(
                  "text-[9px] font-bold uppercase border-none",
                  order.paymentStatus === 'PAID' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                )}>
                  {order.paymentStatus === 'PAID' ? 'Confirmé' : 'En attente'}
                </Badge>
              </div>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Montant Total</span>
                  {order.quotedManually ? (
                    <Button
                      size="sm"
                      onClick={() => setIsAmountDialogOpen(true)}
                      className="h-7 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase px-3"
                    >
                      Sur devis — Fixer le prix
                    </Button>
                  ) : (
                    <span className="text-xl font-black text-slate-900">{order.amount.toLocaleString()} FCFA</span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <span className="text-xs text-slate-500 font-medium">Mode de règlement</span>
                  <div className="flex items-center gap-1.5">
                    {order.paymentMethod === 'ONLINE' ? (
                      <>
                        <CreditCard className="w-3.5 h-3.5 text-fiatlux-primary" />
                        <span className="text-xs font-bold text-slate-700">Plateforme</span>
                      </>
                    ) : (
                      <>
                        <Banknote className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-xs font-bold text-slate-700">Espèces</span>
                      </>
                    )}
                  </div>
                </div>
                {order.paymentStatus !== 'PAID' && isCashOrder && (
                  clientConfirmedCash ? (
                    <Button
                      onClick={() => setIsCashConfirmDialogOpen(true)}
                      className="w-full mt-2 h-10 bg-fiatlux-primary hover:bg-[#0d4270] text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-900/10"
                    >
                      Confirmer encaissement
                    </Button>
                  ) : (
                    <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                      <p className="text-[10px] font-medium text-slate-500">
                        Le client n&apos;a pas encore confirmé avoir payé — rien à encaisser pour l&apos;instant.
                      </p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Actions administratives</h3>
              <Button
                variant="outline"
                disabled={!order.rider}
                onClick={() => order.rider && router.push(`/messages?rider=${order.riderId}`)}
                title={!order.rider ? 'Aucun livreur assigné pour le moment.' : undefined}
                className="w-full h-11 justify-between text-xs font-medium border-slate-200 group hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4 text-slate-400" />
                  {order.rider ? `Contacter ${order.rider.name}` : 'Contacter le livreur'}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-div-icon {
          background: none;
          border: none;
        }
        .leaflet-container {
          width: 100%;
          height: 100%;
          border-radius: 0;
          z-index: 1;
        }
      `}</style>

      {/* Dialog de fixation du prix pour une commande "sur devis" */}
      <Dialog open={isAmountDialogOpen} onOpenChange={setIsAmountDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleSetAmount}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Fixer le montant</DialogTitle>
              <DialogDescription className="text-slate-500">
                Cette commande est sur devis. Saisissez le montant négocié avec le client.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-6">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">Montant (FCFA)</label>
              <input
                name="amount"
                type="number"
                min={1}
                placeholder="Ex: 5000"
                autoFocus
                className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAmountDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={setAmountMutation.isPending} className="bg-fiatlux-primary text-white">
                {setAmountMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Valider'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation d'encaissement — filet de secours admin, uniquement si le client a déjà confirmé */}
      <Dialog open={isCashConfirmDialogOpen} onOpenChange={setIsCashConfirmDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black">Confirmer l&apos;encaissement ?</DialogTitle>
            <DialogDescription>
              Le client a déjà confirmé avoir payé le chauffeur. Cette action force la confirmation à sa
              place — à utiliser uniquement si le chauffeur ne peut pas confirmer lui-même (téléphone hors
              service, perdu...). L&apos;action sera tracée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCashConfirmDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleConfirmCash}
              disabled={confirmCashMutation.isPending}
              className="bg-fiatlux-primary text-white"
            >
              {confirmCashMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Confirmer à la place du chauffeur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'annulation / échec de livraison — motif obligatoire, tracé dans l'historique de statut */}
      <Dialog open={!!statusDialog} onOpenChange={(open) => !open && setStatusDialog(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black">
              {statusDialog === 'CANCELLED' ? 'Annuler cette commande ?' : 'Marquer la livraison en échec ?'}
            </DialogTitle>
            <DialogDescription>
              {statusDialog === 'CANCELLED'
                ? "La commande sera annulée et le livreur, s'il y en a un, redeviendra disponible."
                : "À utiliser si la livraison ne peut pas être menée à terme (destinataire injoignable, adresse introuvable...). Le livreur redeviendra disponible."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Motif (recommandé)</label>
            <Textarea
              placeholder="Ex : client injoignable après plusieurs tentatives..."
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              className="rounded-xl min-h-[90px]"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStatusDialog(null)}>Retour</Button>
            <Button
              onClick={handleConfirmStatusChange}
              disabled={updateStatusMutation.isPending}
              className={cn(
                'text-white',
                statusDialog === 'CANCELLED' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
              )}
            >
              {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {statusDialog === 'CANCELLED' ? 'Confirmer l\'annulation' : "Confirmer l'échec"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'assignation : suggère les livreurs disponibles les plus proches du point de collecte */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Navigation className="w-4.5 h-4.5 text-fiatlux-primary" />
              Assigner un livreur
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Livreurs actifs, triés par distance réelle au point de collecte quand leur position est connue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[360px] overflow-y-auto py-2">
            {isLoadingNearest && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-fiatlux-primary" />
              </div>
            )}

            {isNearestError && (
              <p className="text-xs text-red-500 text-center py-6">
                Impossible de charger les livreurs disponibles.
              </p>
            )}

            {!isLoadingNearest && !isNearestError && nearestRiders?.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6 italic">
                Aucun livreur actif pour le moment. Passez un livreur en statut &quot;Actif&quot; pour pouvoir l&apos;assigner.
              </p>
            )}

            {nearestRiders?.map((r: any) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-fiatlux-primary/30 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-white shadow-sm ring-1 ring-slate-100">
                    <AvatarFallback className="bg-slate-50 text-slate-400 font-bold text-xs">
                      {r.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{r.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">{r.vehiclePlate}</span>
                      <span className="text-[10px] text-fiatlux-primary font-bold">
                        {r.distanceMeters == null
                          ? 'Position inconnue'
                          : r.distanceMeters < 1000
                            ? `${Math.round(r.distanceMeters)} m`
                            : `${(r.distanceMeters / 1000).toFixed(1)} km`}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={assignRiderMutation.isPending}
                  onClick={() => handleAssignRider(r.id)}
                  className="h-8 bg-fiatlux-primary hover:bg-[#0d4270] text-white text-[10px] font-bold uppercase px-4"
                >
                  {assignRiderMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Assigner'}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}