'use client';

import * as React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useRiders } from '@/hooks/use-deliveries';
import { LiveMapFull } from '@/components/live-map/live-map-full';
import { 
  Search, 
  Filter, 
  MapPin, 
  ChevronRight, 
  ChevronLeft, 
  PanelRightClose, 
  PanelRightOpen,
  Navigation,
  Truck,
  Phone,
  ArrowUpRight,
  Info,
  Clock,
  X,
  Layers,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Rider } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export default function LiveMapPage() {
  const { data: riders = [], isLoading } = useRiders();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'ACTIVE' | 'BUSY' | 'INACTIVE'>('ALL');
  const [selectedRiderId, setSelectedRiderId] = React.useState<string | null>(null);

  const activeRiders = React.useMemo(() => {
    return riders.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           r.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesStatus && r.status !== 'INACTIVE';
    });
  }, [riders, searchQuery, statusFilter]);

  const stats = React.useMemo(() => {
    return {
      total: riders.length,
      active: riders.filter(r => r.status === 'ACTIVE').length,
      busy: riders.filter(r => r.status === 'BUSY').length,
      offline: riders.filter(r => r.status === 'INACTIVE').length,
    };
  }, [riders]);

  const handleRiderClick = (rider: Rider) => {
    setSelectedRiderId(rider.id);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Disponible';
      case 'BUSY': return 'En course';
      case 'INACTIVE': return 'Hors ligne';
      default: return status;
    }
  };

  return (
    <DashboardLayout fullWidth>
      <div className="relative flex h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-50">
        
        {/* Main Content Area */}
        <div className="relative flex-1 flex flex-col min-w-0 h-full">
          
          {/* Top Filter Bar */}
          <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              <div className="bg-white/95 backdrop-blur-sm p-1.5 rounded-2xl shadow-xl border border-white/20 flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Rechercher un livreur..." 
                    className="h-10 w-64 pl-10 border-none bg-slate-50 focus-visible:ring-0 rounded-xl font-medium text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-50">
                        <Filter className="w-4 h-4 text-slate-500" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="start" className="w-56 p-2 rounded-2xl shadow-2xl border-slate-100">
                    <p className="px-2 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Filtrer par statut</p>
                    <DropdownMenuItem onClick={() => setStatusFilter('ALL')} className="rounded-xl">Tous les statuts</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('ACTIVE')} className="rounded-xl">Disponible</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('BUSY')} className="rounded-xl">En course</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-6 bg-slate-100 mx-1"></div>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="sm" className="h-10 px-4 rounded-xl hover:bg-slate-50 gap-2 font-bold text-slate-600">
                        <Layers className="w-4 h-4 text-fiatlux-primary" />
                        Zones
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="start" className="w-56 p-2 rounded-2xl shadow-2xl border-slate-100">
                    <p className="px-2 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Zones d&apos;activité</p>
                    <DropdownMenuItem className="rounded-xl">Grand Marché</DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl">Aéroport</DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl">Pointe-Noire Centre</DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl">Côte Sauvage</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-center gap-3 pointer-events-auto">
              <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-xl border border-white/20 flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En transit</span>
                  <span className="text-sm font-black text-emerald-600">{stats.active}</span>
                </div>
                <div className="w-px h-6 bg-slate-100"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Collecte</span>
                  <span className="text-sm font-black text-amber-500">{stats.busy}</span>
                </div>
                <div className="w-px h-6 bg-slate-100"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertes</span>
                  <span className="text-sm font-black text-red-500">2</span>
                </div>
              </div>

              {!sidebarOpen && (
                <Button 
                  onClick={() => setSidebarOpen(true)}
                  className="bg-white hover:bg-slate-50 text-slate-900 h-12 w-12 rounded-2xl shadow-xl border border-white/20"
                  size="icon"
                >
                  <PanelRightOpen className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Map Component */}
          <div className="flex-1 w-full h-full relative z-10">
            <LiveMapFull 
              riders={activeRiders} 
              selectedRiderId={selectedRiderId}
              onRiderClick={handleRiderClick}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Retractable Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-96 bg-white border-l border-slate-100 flex flex-col h-full shadow-2xl z-30"
            >
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Livreurs actifs</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Monitoring temps réel</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-xl hover:bg-slate-50 text-slate-400"
                >
                  <PanelRightClose className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-fiatlux-primary animate-spin mb-4" />
                    <p className="text-sm font-bold text-slate-400">Synchronisation...</p>
                  </div>
                ) : activeRiders.length > 0 ? (
                  activeRiders.map((rider) => (
                    <motion.div
                      key={rider.id}
                      layoutId={rider.id}
                      onClick={() => handleRiderClick(rider)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer group",
                        selectedRiderId === rider.id 
                          ? "bg-blue-50 border-blue-100 shadow-lg shadow-blue-900/5 ring-1 ring-fiatlux-primary/20" 
                          : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden relative">
                              {rider.avatar ? (
                                <Image 
                                  src={rider.avatar} 
                                  alt={rider.name} 
                                  fill
                                  className="object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm font-black text-slate-400 uppercase">
                                  {rider.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className={cn(
                              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                              rider.status === 'ACTIVE' ? "bg-emerald-500" : "bg-amber-500"
                            )}></span>
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900 leading-none group-hover:text-fiatlux-primary transition-colors">
                              {rider.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className={cn(
                                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest border",
                                rider.status === 'ACTIVE' 
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                  : "bg-amber-50 text-amber-600 border-amber-100"
                              )}>
                                {getStatusLabel(rider.status)}
                              </Badge>
                              <span className="text-[10px] font-bold text-slate-400">{rider.vehiclePlate}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowUpRight className="w-4 h-4 text-slate-400" />
                        </Button>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100/50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Navigation className="w-3.5 h-3.5 text-fiatlux-primary" />
                          <span className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">
                            {rider.currentLocation?.address || 'Position inconnue'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-300" />
                          <span className="text-[9px] font-bold text-slate-400 tracking-tighter">ETA: 12 MIN</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <Search className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">Aucun livreur trouvé</p>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Essayez de modifier vos filtres ou votre recherche pour trouver un livreur actif.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Quick Info */}
              <div className="p-6 border-t border-slate-50 bg-slate-50/30">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-fiatlux-primary/5 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-fiatlux-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Capacité flotte</p>
                      <p className="text-[10px] font-bold text-slate-400">82% de la flotte en cours</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-fiatlux-primary flex items-center justify-center text-[10px] font-black text-slate-900">
                    82%
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}