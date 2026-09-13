'use client';

import * as React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAlerts } from '@/hooks/use-deliveries';
import { 
  AlertCircle, 
  Search, 
  Filter, 
  MapPin, 
  SignalLow, 
  Wallet, 
  Clock, 
  MoreVertical, 
  CheckCircle2, 
  ExternalLink,
  Loader2,
  Calendar,
  User,
  Hash,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Alert } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AlertsPage() {
  const { data: alerts, isLoading } = useAlerts();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ACTIVE');
  const [severityFilter, setSeverityFilter] = React.useState<string>('ALL');

  const filteredAlerts = React.useMemo(() => {
    if (!alerts) return [];
    return alerts.filter(alert => {
      const matchesSearch = 
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.riderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'ALL' || alert.type === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || alert.status === statusFilter;
      const matchesSeverity = severityFilter === 'ALL' || alert.severity === severityFilter;

      return matchesSearch && matchesType && matchesStatus && matchesSeverity;
    });
  }, [alerts, searchQuery, typeFilter, statusFilter, severityFilter]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'STALL': return <Clock className="w-4 h-4" />;
      case 'DEVIATION': return <MapPin className="w-4 h-4" />;
      case 'OFFLINE': return <SignalLow className="w-4 h-4" />;
      case 'PAYMENT': return <Wallet className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge className="bg-red-50 text-red-700 border-red-100 font-black text-[9px] uppercase px-1.5 rounded">Critique</Badge>;
      case 'WARNING':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-100 font-black text-[9px] uppercase px-1.5 rounded">Attention</Badge>;
      case 'INFO':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-black text-[9px] uppercase px-1.5 rounded">Info</Badge>;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'STALL': return 'text-red-600 bg-red-50';
      case 'DEVIATION': return 'text-amber-600 bg-amber-50';
      case 'OFFLINE': return 'text-slate-600 bg-slate-100';
      case 'PAYMENT': return 'text-blue-600 bg-blue-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Alertes & Anomalies
              {isLoading && <Loader2 className="w-6 h-6 animate-spin text-slate-400" />}
            </h1>
            <p className="text-slate-500 font-medium mt-1">Surveillez et résolvez les incidents opérationnels en temps réel.</p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden group">
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Alertes Actives</p>
                  <p className="text-3xl font-black text-slate-900">
                    {alerts?.filter(a => a.status === 'ACTIVE').length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Critiques</p>
                  <p className="text-3xl font-black text-red-600">
                    {alerts?.filter(a => a.status === 'ACTIVE' && a.severity === 'CRITICAL').length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dévations</p>
                  <p className="text-3xl font-black text-slate-900">
                    {alerts?.filter(a => a.type === 'DEVIATION' && a.status === 'ACTIVE').length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Résolues (24h)</p>
                  <p className="text-3xl font-black text-emerald-600">
                    {alerts?.filter(a => a.status === 'RESOLVED').length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Table */}
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Rechercher par titre, livreur, commande..." 
                    className="h-12 pl-12 rounded-xl border-slate-200 focus:ring-fiatlux-primary/20 font-medium"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'ALL', label: 'Tous' },
                    { id: 'STALL', label: 'Arrêts' },
                    { id: 'DEVIATION', label: 'Déviations' },
                    { id: 'OFFLINE', label: 'Hors Ligne' },
                    { id: 'PAYMENT', label: 'Paiements' }
                  ].map(type => (
                    <button 
                      key={type.id}
                      onClick={() => setTypeFilter(type.id)}
                      className={cn(
                        "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap",
                        typeFilter === type.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>

                <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100">
                  <button 
                    onClick={() => setStatusFilter('ACTIVE')}
                    className={cn(
                      "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                      statusFilter === 'ACTIVE' ? "bg-white text-red-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Actives
                  </button>
                  <button 
                    onClick={() => setStatusFilter('RESOLVED')}
                    className={cn(
                      "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                      statusFilter === 'RESOLVED' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Résolues
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-12 h-12 text-fiatlux-primary animate-spin mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Analyse de la flotte en cours...</p>
              </div>
            ) : filteredAlerts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-50">
                    <TableHead className="pl-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Type & Incident</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest min-w-[300px]">Détails de l&apos;incident</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest min-w-[180px]">Livreur / Commande</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Sévérité</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Temps écoulé</TableHead>
                    <TableHead className="pr-8 py-5 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert) => (
                    <TableRow key={alert.id} className="hover:bg-slate-50/50 transition-colors border-slate-50 group">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", getTypeColor(alert.type))}>
                            {getAlertIcon(alert.type)}
                          </div>
                          <div>
                            <span className="text-sm font-black text-slate-900 block">{alert.title}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{alert.type}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 min-w-[300px] max-w-sm">
                        <p className="text-xs font-medium text-slate-600 leading-relaxed break-words">{alert.description}</p>
                      </TableCell>
                      <TableCell className="py-5 min-w-[180px]">
                        <div className="space-y-1.5">
                          {alert.riderName && (
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="text-xs font-bold text-slate-700">{alert.riderName}</span>
                            </div>
                          )}
                          {alert.orderNumber && (
                            <div className="flex items-center gap-2">
                              <Hash className="w-3 h-3 text-slate-400" />
                              <span className="text-xs font-black text-fiatlux-primary">{alert.orderNumber}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        {getSeverityBadge(alert.severity)}
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900">{alert.duration || 'N/A'}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                            {format(new Date(alert.timestamp), "HH:mm '•' dd MMM", { locale: fr })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {alert.status === 'ACTIVE' && (
                            <Button 
                              variant="ghost" 
                              className="h-9 px-4 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-black text-[10px] uppercase tracking-widest"
                            >
                              Résoudre
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-9 w-9 p-0 rounded-lg border-slate-100 hover:bg-slate-100 transition-all")}>
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-slate-200 p-2 min-w-[160px]">
                              <DropdownMenuItem className="gap-2 font-bold text-xs p-3 rounded-lg">
                                <ExternalLink className="w-4 h-4" />
                                Voir le détail
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 font-bold text-xs p-3 rounded-lg">
                                <MapPin className="w-4 h-4" />
                                Localiser sur la carte
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 font-bold text-xs p-3 rounded-lg text-slate-400 italic">
                                <Info className="w-4 h-4" />
                                Historique
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-24">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Tout est sous contrôle</h3>
                <p className="text-slate-500 mt-2 max-w-xs mx-auto font-medium">
                  Aucune alerte active ne correspond à vos critères actuels.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('ALL');
                    setStatusFilter('ALL');
                    setSeverityFilter('ALL');
                  }}
                  className="mt-6 rounded-xl font-black text-xs uppercase tracking-widest h-11 px-8"
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
