'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useRider } from '@/hooks/use-riders';
import { 
  ArrowLeft, 
  MapPin, 
  Truck, 
  Star, 
  AlertTriangle, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Loader2,
  Navigation,
  History,
  SignalLow,
  Wallet,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { RIDER_STATUS_COLORS, STATUS_COLORS } from '@/constants';
import { OrderStatus } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });

const ALERT_STYLES: Record<string, { border: string; iconBg: string; iconColor: string; icon: any; label: string; badge: string }> = {
  STALL: { border: 'border-red-100', iconBg: 'bg-red-50', iconColor: 'text-red-500', icon: Clock, label: 'Arrêt prolongé', badge: 'text-red-600 bg-red-50' },
  DEVIATION: { border: 'border-amber-100', iconBg: 'bg-amber-50', iconColor: 'text-amber-500', icon: Navigation, label: 'Déviation d\'itinéraire', badge: 'text-amber-600 bg-amber-50' },
  OFFLINE: { border: 'border-slate-200', iconBg: 'bg-slate-100', iconColor: 'text-slate-500', icon: SignalLow, label: 'Hors ligne', badge: 'text-slate-600 bg-slate-100' },
  PAYMENT: { border: 'border-blue-100', iconBg: 'bg-blue-50', iconColor: 'text-blue-500', icon: Wallet, label: 'Paiement', badge: 'text-blue-600 bg-blue-50' },
};

export default function RiderDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: rider, isLoading, error } = useRider(id);

  React.useEffect(() => {
    import('leaflet').then((leaflet) => {
      delete (leaflet as any).Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    });
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-12 h-12 text-fiatlux-primary animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Chargement du profil...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !rider) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Livreur introuvable</h2>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Nous n&apos;avons pas pu trouver les informations pour ce livreur. Il a peut-être été supprimé ou l&apos;ID est incorrect.
          </p>
          <Button 
            onClick={() => router.push('/riders')}
            className="mt-8 bg-fiatlux-primary text-white"
          >
            Retour à la liste
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Disponible';
      case 'BUSY': return 'En livraison';
      case 'INACTIVE': return 'Hors ligne';
      default: return status;
    }
  };

  const getDeliveryStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'En attente';
      case OrderStatus.ASSIGNED: return 'Assigné';
      case OrderStatus.ACCEPTED: return 'Accepté';
      case OrderStatus.EN_ROUTE_TO_PICKUP: return 'En route';
      case OrderStatus.AT_PICKUP: return 'Arrivé collecte';
      case OrderStatus.PICKED_UP: return 'Récupéré';
      case OrderStatus.IN_TRANSIT: return 'En transit';
      case OrderStatus.AT_DROPOFF: return 'Arrivé livraison';
      case OrderStatus.DELIVERED: return 'Livré';
      case OrderStatus.CANCELLED: return 'Annulé';
      case OrderStatus.FAILED: return 'Échec';
      default: return status;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => router.back()}
              className="h-11 w-11 rounded-full border-slate-200 text-slate-400 hover:text-slate-600 transition-all shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-white shadow-xl">
                  <AvatarImage src={rider.avatar} />
                  <AvatarFallback className="bg-slate-50 text-slate-400 font-bold text-2xl">
                    {rider.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className={cn(
                  "absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-white",
                  rider.status === 'ACTIVE' ? "bg-emerald-500" : 
                  rider.status === 'BUSY' ? "bg-amber-500" : "bg-slate-300"
                )}></span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{rider.name}</h1>
                  <Badge variant="secondary" className={cn("text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider border", RIDER_STATUS_COLORS[rider.status])}>
                    {getStatusLabel(rider.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5 text-sm">
                    <Truck className="w-4 h-4 text-fiatlux-primary" />
                    {rider.vehiclePlate}
                  </span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <Phone className="w-4 h-4 text-fiatlux-primary" />
                    {rider.phone}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" className="font-bold border-slate-200">
              Modifier le profil
            </Button>
            <Button className="bg-fiatlux-primary text-white font-bold px-6 shadow-lg shadow-blue-900/20">
              Contacter le livreur
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-fiatlux-primary" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border-emerald-100">
                  Aujourd&apos;hui
                </Badge>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Livraisons</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{rider.deliveriesToday ?? 0}</span>
                  <span className="text-xs font-bold text-slate-500">courses</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                  <History className="w-6 h-6 text-purple-600" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-slate-500 bg-slate-50 border-slate-100">
                  Ce mois
                </Badge>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total mois</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{rider.deliveriesMonth ?? 0}</span>
                  <span className="text-xs font-bold text-slate-500">courses</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Note moyenne</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{rider.rating != null ? rider.rating.toFixed(1) : '—'}</span>
                  <span className="text-xs font-bold text-slate-500">/ 5.0</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <Badge variant="outline" className={cn(
                  "text-[10px] font-bold",
                  (rider.alerts?.length || 0) === 0 ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-red-600 bg-red-50 border-red-100"
                )}>
                  {(rider.alerts?.length || 0) === 0 ? 'RAS' : 'À traiter'}
                </Badge>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Alertes actives</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{rider.alerts?.length ?? 0}</span>
                  <span className="text-xs font-bold text-slate-500">non résolue{(rider.alerts?.length ?? 0) > 1 ? 's' : ''}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: History & Map */}
          <div className="lg:col-span-2 space-y-8">
            {/* Current Location Map */}
            <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="pb-0 pt-6 px-8 flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-fiatlux-primary" />
                  Position actuelle
                </CardTitle>
                {rider.currentLocation && rider.updatedAt && (
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    <Clock className="w-3.5 h-3.5" />
                    Mis à jour {formatDistanceToNow(new Date(rider.updatedAt), { locale: fr, addSuffix: true })}
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-8">
                <div className="relative h-[300px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                  {rider.currentLocation ? (
                    <>
                      <MapContainer
                        center={[rider.currentLocation.lat, rider.currentLocation.lng]}
                        zoom={14}
                        scrollWheelZoom={false}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[rider.currentLocation.lat, rider.currentLocation.lng]} />
                      </MapContainer>
                      {rider.currentLocation.address && (
                        <div className="absolute bottom-6 left-6 z-[1000] pointer-events-none">
                          <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-xl border border-white/20">
                            <div className="w-10 h-10 rounded-lg bg-fiatlux-primary flex items-center justify-center shadow-lg shadow-blue-900/20">
                              <MapPin className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Adresse</p>
                              <p className="text-sm font-bold text-slate-900">{rider.currentLocation.address}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-2">
                      <MapPin className="w-8 h-8 text-slate-300" />
                      <p className="text-sm text-slate-400 font-medium">Position non disponible pour ce livreur.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Delivery History */}
            <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="pb-2 pt-8 px-8 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">Historique des courses</CardTitle>
                  <p className="text-sm text-slate-500 font-medium mt-1">Les dernières activités de livraison de ce livreur.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-bold border-slate-200"
                  disabled={!rider.orders || rider.orders.length === 0}
                  onClick={() => {
                    const rows = [
                      ['N° Commande', 'Date', 'Client', 'Statut', 'Montant'],
                      ...(rider.orders || []).map((o) => [
                        o.trackingNumber,
                        format(new Date(o.createdAt), 'dd/MM/yyyy HH:mm'),
                        o.customerName,
                        getDeliveryStatusLabel(o.status),
                        String(o.amount),
                      ]),
                    ];
                    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `livreur-${rider.name.replace(/\s+/g, '-').toLowerCase()}-courses.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Exporter CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="pl-8 text-xs font-black uppercase text-slate-400 tracking-widest py-5">N° Commande</TableHead>
                      <TableHead className="text-xs font-black uppercase text-slate-400 tracking-widest py-5">Date</TableHead>
                      <TableHead className="text-xs font-black uppercase text-slate-400 tracking-widest py-5">Client</TableHead>
                      <TableHead className="text-xs font-black uppercase text-slate-400 tracking-widest py-5 text-center">Statut</TableHead>
                      <TableHead className="text-xs font-black uppercase text-slate-400 tracking-widest py-5 text-right pr-8">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rider.orders?.map((order) => (
                      <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                        <TableCell className="pl-8 py-5">
                          <span className="font-mono font-bold text-slate-900 text-xs group-hover:text-fiatlux-primary transition-colors">
                            {order.trackingNumber}
                          </span>
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">
                              {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: fr })}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {format(new Date(order.createdAt), 'HH:mm')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          <span className="text-sm font-medium text-slate-600">{order.customerName}</span>
                        </TableCell>
                        <TableCell className="py-5 text-center">
                          <Badge variant="secondary" className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider", STATUS_COLORS[order.status])}>
                            {getDeliveryStatusLabel(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8 py-5">
                          <span className="text-sm font-black text-slate-900">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(order.amount)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {(!rider.orders || rider.orders.length === 0) && (
                  <div className="text-center py-20">
                    <p className="text-slate-400 font-medium italic">Aucune commande enregistrée pour ce livreur.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Info & Alerts */}
          <div className="space-y-8">
            {/* Rider Info Card */}
            <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="pb-4 pt-8 px-8">
                <CardTitle className="text-xl font-bold">Informations</CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-50">
                    <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Date d&apos;entrée</span>
                    <span className="text-sm font-bold text-slate-700">
                      {rider.joinedAt ? format(new Date(rider.joinedAt), 'dd MMMM yyyy', { locale: fr }) : 'Non renseignée'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-50">
                    <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Téléphone</span>
                    <span className="text-sm font-bold text-slate-700">{rider.phone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Anomalies & Alerts */}
            <Card className={cn("border-slate-200 shadow-sm rounded-3xl overflow-hidden", (rider.alerts?.length ?? 0) > 0 && "bg-red-50/20")}>
              <CardHeader className="pb-4 pt-8 px-8">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <AlertTriangle className={cn("w-5 h-5", (rider.alerts?.length ?? 0) > 0 ? "text-red-500" : "text-slate-300")} />
                  Alertes & Anomalies
                </CardTitle>
                <p className="text-xs text-slate-500 font-medium">Alertes non résolues concernant ce livreur.</p>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-4">
                <div className="space-y-3">
                  {(!rider.alerts || rider.alerts.length === 0) ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">Aucune alerte active pour ce livreur.</p>
                  ) : (
                    rider.alerts.map((alert: any) => {
                      const style = ALERT_STYLES[alert.type] || ALERT_STYLES.OFFLINE;
                      const Icon = style.icon;
                      return (
                        <div key={alert.id} className={cn("p-4 rounded-2xl bg-white border shadow-sm hover:shadow-md transition-all", style.border)}>
                          <div className="flex items-start gap-3">
                            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-1", style.iconBg)}>
                              <Icon className={cn("w-5 h-5", style.iconColor)} />
                            </div>
                            <div>
                              <h5 className="text-sm font-bold text-slate-900">{alert.title}</h5>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{alert.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest", style.badge)}>
                                  {style.label}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">
                                  {formatDistanceToNow(new Date(alert.createdAt), { locale: fr, addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <Link href="/alerts">
                  <Button variant="ghost" className="w-full text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors">
                    Voir toutes les alertes
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}