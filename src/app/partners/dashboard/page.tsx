'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Package, 
  Clock, 
  TrendingUp, 
  Plus, 
  Search, 
  LogOut, 
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Bike,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PartnerAuthService } from '@/services/partner-auth.service';
import { useOrders } from '@/hooks/use-orders';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [partner, setPartner] = React.useState<any>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const { data: orders, isLoading } = useOrders({ 
    partnerId: partner?.id 
  });

  React.useEffect(() => {
    const info = PartnerAuthService.getPartnerInfo();
    if (!info) {
      router.push('/partners/login');
    } else {
      setPartner(info);
    }
  }, [router]);

  const handleLogout = () => {
    PartnerAuthService.logout();
    router.push('/partners/login');
  };

  const handleNewOrder = () => {
    // Pre-fill with partner info
    const params = new URLSearchParams({
      name: partner?.name || '',
      phone: partner?.phone || '',
      address: partner?.address || '',
      prefilled: 'true'
    });
    router.push(`/commander?${params.toString()}`);
  };

  const filteredOrders = orders?.filter(o => 
    (o.trackingNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (o.recipientName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const stats = React.useMemo(() => {
    if (!orders) return { monthly: 0, amount: 0, ongoing: 0 };
    
    const now = new Date();
    const currentMonthOrders = orders.filter(o => {
      const d = new Date(o.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    return {
      monthly: currentMonthOrders.length,
      amount: currentMonthOrders.reduce((acc, o) => acc + o.amount, 0),
      ongoing: orders.filter(o => ['PENDING', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status)).length
    };
  }, [orders]);

  if (!partner) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar/Header hybrid for mobile/desktop */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-8 h-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-2.5 rounded-xl shadow-lg shadow-slate-200">
            <Building2 className="w-6 h-6 text-fiatlux-primary" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-400">Portail Partenaire</h1>
            <p className="text-lg font-black text-slate-900 italic leading-none">{partner.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Button 
            onClick={handleNewOrder}
            className="hidden md:flex bg-fiatlux-primary hover:bg-fiatlux-primary/90 text-white font-bold rounded-xl gap-2 h-11 px-6 shadow-lg shadow-blue-100"
          >
            <Plus className="w-5 h-5" /> Nouvelle Commande
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-[32px] border-0 shadow-xl shadow-slate-200/50 overflow-hidden bg-white group hover:scale-[1.02] transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-50 p-3 rounded-2xl group-hover:bg-fiatlux-primary group-hover:text-white transition-colors">
                  <Package className="w-6 h-6 text-fiatlux-primary group-hover:text-white" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px] font-black uppercase tracking-widest">Ce mois</Badge>
              </div>
              <p className="text-4xl font-black text-slate-900 italic">{stats.monthly}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Commandes passées</p>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-0 shadow-xl shadow-slate-200/50 overflow-hidden bg-white group hover:scale-[1.02] transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-emerald-50 p-3 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <TrendingUp className="w-6 h-6 text-emerald-600 group-hover:text-white" />
                </div>
                <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] font-black uppercase tracking-widest">Facturation</Badge>
              </div>
              <p className="text-4xl font-black text-slate-900 italic">{stats.amount.toLocaleString()} <span className="text-sm not-italic font-bold text-slate-400">FCFA</span></p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Volume d'affaires</p>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-0 shadow-xl shadow-slate-200/50 overflow-hidden bg-white group hover:scale-[1.02] transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-orange-50 p-3 rounded-2xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <Clock className="w-6 h-6 text-orange-600 group-hover:text-white" />
                </div>
                <Badge className="bg-orange-50 text-orange-600 border-orange-100 text-[10px] font-black uppercase tracking-widest">En cours</Badge>
              </div>
              <p className="text-4xl font-black text-slate-900 italic">{stats.ongoing}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Livraisons actives</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Section */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-slate-900 italic tracking-tight">Historique des commandes</h2>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="N° de suivi, destinataire..." 
                className="h-12 pl-12 rounded-2xl border-slate-200 bg-white shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="md:hidden space-y-4">
            {isLoading ? (
              <div className="bg-white rounded-[32px] p-12 text-center shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-fiatlux-primary mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chargement...</p>
              </div>
            ) : filteredOrders?.length === 0 ? (
              <div className="bg-white rounded-[32px] p-12 text-center shadow-sm">
                <Package className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400">Aucune commande</p>
              </div>
            ) : filteredOrders?.map((order) => (
              <Card key={order.id} className="rounded-[32px] border-0 shadow-xl shadow-slate-200/40 overflow-hidden bg-white">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-900 tracking-tight font-mono">{order.trackingNumber}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[150px]">{order.packageDescription}</span>
                    </div>
                    <Badge className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
                      order.status === 'DELIVERED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      order.status === 'CANCELLED' ? "bg-red-50 text-red-700 border-red-100" :
                      "bg-blue-50 text-blue-700 border-blue-100"
                    )}>
                      {order.status}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Destinataire</p>
                      <p className="text-sm font-bold text-slate-700">{order.recipientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{order.amount.toLocaleString()} FCFA</p>
                      <p className="text-[10px] font-bold text-slate-400">{format(new Date(order.createdAt), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>

                  <Link href={`/suivi/${order.trackingNumber}`} target="_blank" className="block">
                    <Button variant="outline" className="w-full h-12 rounded-2xl border-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-fiatlux-primary gap-2">
                      Suivre la livraison <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hidden md:block rounded-[40px] border-0 shadow-2xl shadow-slate-200/40 overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Référence</TableHead>
                  <TableHead className="py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Destinataire</TableHead>
                  <TableHead className="py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date</TableHead>
                  <TableHead className="py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Montant</TableHead>
                  <TableHead className="py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Statut</TableHead>
                  <TableHead className="py-6 px-8 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <Loader2 className="w-10 h-10 animate-spin text-fiatlux-primary mx-auto mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Synchronisation des données...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredOrders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-10 h-10 text-slate-200" />
                      </div>
                      <p className="text-sm font-bold text-slate-400">Aucune commande trouvée</p>
                      <Button variant="link" onClick={handleNewOrder} className="text-fiatlux-primary font-black uppercase tracking-widest text-[10px] mt-2">
                        Créer votre première commande
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : filteredOrders?.map((order) => (
                  <TableRow key={order.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <TableCell className="py-6 px-8">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 tracking-tight font-mono">{order.trackingNumber}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[150px]">{order.packageDescription}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-6 px-4">
                      <span className="text-sm font-bold text-slate-700">{order.recipientName}</span>
                    </TableCell>
                    <TableCell className="py-6 px-4">
                      <span className="text-[10px] font-bold text-slate-500">{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: fr })}</span>
                    </TableCell>
                    <TableCell className="py-6 px-4">
                      <span className="text-sm font-black text-slate-900">{order.amount.toLocaleString()} FCFA</span>
                    </TableCell>
                    <TableCell className="py-6 px-4">
                      <Badge className={cn(
                        "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
                        order.status === 'DELIVERED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        order.status === 'CANCELLED' ? "bg-red-50 text-red-700 border-red-100" :
                        "bg-blue-50 text-blue-700 border-blue-100"
                      )}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-6 px-8 text-right">
                      <Link href={`/suivi/${order.trackingNumber}`} target="_blank">
                        <Button variant="ghost" size="sm" className="h-10 rounded-xl hover:bg-white hover:shadow-md transition-all gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-fiatlux-primary">
                          Suivre <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-8 py-12 text-center opacity-30 border-t border-slate-200 mt-12">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
          FIATLUX PARTNER PLATFORM v1.0
        </p>
      </footer>

      {/* Floating Action Button for Mobile */}
      <Button 
        onClick={handleNewOrder}
        className="md:hidden fixed bottom-6 right-6 w-16 h-16 rounded-full bg-fiatlux-primary text-white shadow-2xl shadow-blue-400 z-50 flex items-center justify-center p-0"
      >
        <Plus className="w-8 h-8" />
      </Button>
    </div>
  );
}
