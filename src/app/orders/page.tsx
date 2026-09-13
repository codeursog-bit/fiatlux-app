'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import Link from 'next/link';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Eye,
  Truck,
  CreditCard,
  Banknote,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Calendar
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useOrders } from '@/hooks/use-orders';
import { OrderStatus } from '@/types';
import { STATUS_COLORS } from '@/constants';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { NewOrderDialog } from '@/components/orders/new-order-dialog';
import { cn } from '@/lib/utils';

export default function OrdersPage() {
  const router = useRouter();
  const [isNewOrderOpen, setIsNewOrderOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  
  const { data: orders, isLoading } = useOrders({ 
    search: search.length >= 2 ? search : undefined, 
    status: statusFilter !== 'ALL' ? statusFilter : undefined 
  });

  const getStatusLabel = (status: OrderStatus) => {
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

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'PENDING': return <Clock className="w-3 h-3 text-amber-500" />;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-fiatlux-primary" />
              Commandes
            </h1>
            <p className="text-sm text-slate-500 mt-1">Gérez et suivez l&apos;ensemble des livraisons sur le réseau FIATLUX.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-9 text-xs font-bold uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 mr-2" />
              Filtrer
            </Button>
            <Button variant="outline" className="h-9 text-xs font-bold uppercase tracking-wider">
              <Download className="w-3.5 h-3.5 mr-2" />
              Exporter
            </Button>
            <Button 
              onClick={() => setIsNewOrderOpen(true)}
              className="h-9 bg-fiatlux-primary hover:bg-[#0d4270] text-white font-bold uppercase tracking-wider text-xs px-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle commande
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Rechercher par N° commande ou client..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9 text-sm border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-fiatlux-primary"
            >
              <option value="ALL">Tous les statuts</option>
              {Object.values(OrderStatus).map((status) => (
                <option key={status} value={status}>{getStatusLabel(status)}</option>
              ))}
            </select>
            <Button variant="outline" className="h-9 px-3 border-slate-200 bg-slate-50/50">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">N° Commande</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Client</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Livreur Assigné</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Statut</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Montant</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Paiement</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Créé le</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell colSpan={8} className="py-4 px-4">
                        <div className="h-4 bg-slate-100 rounded w-full"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : orders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center text-slate-400 text-sm italic">
                      Aucune commande trouvée.
                    </TableCell>
                  </TableRow>
                ) : orders?.map((order) => (
                  <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="font-mono font-bold text-slate-900 text-xs">
                      <Link href={`/orders/${order.id}`} className="hover:text-fiatlux-primary transition-colors">
                        {order.trackingNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-xs">{order.customerName}</span>
                        <span className="text-[10px] text-slate-500">{order.pickupAddress}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.rider ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 border border-slate-200">
                            <AvatarFallback className="text-[8px] font-bold bg-slate-100">{order.rider.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-slate-700">{order.rider.name}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[9px] px-2 py-0.5 rounded uppercase font-bold", STATUS_COLORS[order.status])}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 text-xs">
                      {order.quotedManually ? (
                        <span className="text-amber-600">Sur devis</span>
                      ) : (
                        `${order.amount.toLocaleString()} FCFA`
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          {order.paymentMethod === 'ONLINE' ? (
                            <CreditCard className="w-3 h-3 text-fiatlux-primary" />
                          ) : (
                            <Banknote className="w-3 h-3 text-slate-500" />
                          )}
                          <span className="text-[10px] font-medium text-slate-600">
                            {order.paymentMethod === 'ONLINE' ? 'Plateforme' : 'Espèces'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getPaymentStatusIcon(order.paymentStatus)}
                          <span className={cn(
                            "text-[9px] font-bold uppercase",
                            order.paymentStatus === 'PAID' ? "text-green-600" : "text-amber-600"
                          )}>
                            {order.paymentStatus === 'PAID' ? 'Payé' : 'En attente'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-500 font-medium">
                      {format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            className="text-xs flex items-center gap-2 py-2 cursor-pointer"
                            onClick={() => router.push(`/orders/${order.id}`)}
                          >
                            <Eye className="w-3.5 h-3.5" /> Voir détails
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs flex items-center gap-2 py-2">
                            <Truck className="w-3.5 h-3.5" /> Modifier livreur
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs flex items-center gap-2 py-2 text-red-600 focus:text-red-600">
                            <XCircle className="w-3.5 h-3.5" /> Annuler
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">
              Affichage de {orders?.length || 0} résultats sur 158
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((p) => (
                  <Button 
                    key={p} 
                    variant={p === 1 ? "default" : "outline"} 
                    className={cn(
                      "h-7 w-7 text-[10px] font-bold",
                      p === 1 && "bg-fiatlux-primary"
                    )}
                  >
                    {p}
                  </Button>
                ))}
                <span className="px-1 text-slate-400">...</span>
                <Button variant="outline" className="h-7 w-7 text-[10px] font-bold">8</Button>
              </div>
              <Button variant="outline" size="icon" className="h-7 w-7">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <NewOrderDialog 
        open={isNewOrderOpen} 
        onOpenChange={setIsNewOrderOpen} 
      />
    </DashboardLayout>
  );
}