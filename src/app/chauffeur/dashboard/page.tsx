'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, Package, TrendingUp, ChevronRight, MapPin, PlusCircle } from 'lucide-react';
import { ChauffeurLayout } from '@/components/layout/chauffeur-layout';
import { useRiderStats, useMyOrders } from '@/hooks/use-rider-portal';
import { RiderAuthService } from '@/services/rider-auth.service';
import { cn } from '@/lib/utils';

export default function ChauffeurDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useRiderStats();
  const { data: myOrders, isLoading: ordersLoading } = useMyOrders();
  const [riderFirstName, setRiderFirstName] = React.useState('');

  // getRiderInfo() lit le localStorage : le serveur (SSR) ne peut jamais
  // le voir et rend toujours une valeur vide. Si on l'appelle directement
  // pendant le rendu, le client affiche le vrai nom dès l'hydratation —
  // texte différent du HTML serveur → erreur d'hydratation. On décale
  // donc la lecture après le montage, une fois le rendu déjà synchronisé.
  React.useEffect(() => {
    const rider = RiderAuthService.getRiderInfo();
    setRiderFirstName(rider?.name?.split(' ')[0] || '');
  }, []);

  const activeOrder = myOrders?.[0];

  return (
    <ChauffeurLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-black text-slate-900">Bonjour {riderFirstName} 👋</h1>
          <p className="text-xs text-slate-500 font-medium">Voici votre activité</p>
        </div>

        {ordersLoading ? (
          <div className="h-24 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-fiatlux-primary" />
          </div>
        ) : activeOrder ? (
          <Link
            href={`/chauffeur/courses/${activeOrder.id}`}
            className="block bg-fiatlux-primary text-white rounded-2xl p-5 shadow-lg shadow-fiatlux-primary/20"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Course en cours</span>
              <ChevronRight className="w-4 h-4 text-white/70" />
            </div>
            <p className="text-sm font-bold mb-1">{activeOrder.trackingNumber}</p>
            <div className="flex items-start gap-2 text-white/80 text-xs">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{activeOrder.pickupAddress} → {activeOrder.dropoffAddress}</span>
            </div>
          </Link>
        ) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-500">Aucune course en cours</p>
            <Link
              href="/chauffeur/disponibles"
              className="inline-block mt-3 text-xs font-black uppercase tracking-wider text-fiatlux-primary"
            >
              Voir les commandes disponibles →
            </Link>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Aujourd'hui", data: stats?.today },
            { label: 'Cette semaine', data: stats?.week },
            { label: 'Ce mois', data: stats?.month },
          ].map((period) => (
            <div key={period.label} className="bg-white border border-slate-200 rounded-2xl p-3 text-center">
              {statsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-300 mx-auto" />
              ) : (
                <>
                  <p className="text-xl font-black text-slate-900">{period.data?.deliveries ?? 0}</p>
                  <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mt-0.5">{period.label}</p>
                  <p className="text-[10px] font-bold text-fiatlux-primary mt-1">
                    {(period.data?.amount ?? 0).toLocaleString()} FCFA
                  </p>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Note moyenne</p>
              <p className="text-sm font-black text-slate-900">{stats?.rating?.toFixed(1) ?? '5.0'} / 5.0</p>
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-400">{stats?.totalDeliveriesAllTime ?? 0} courses au total</p>
        </div>

        <Link
          href="/chauffeur/nouvelle-course"
          className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl p-4 text-slate-500 hover:border-fiatlux-primary hover:text-fiatlux-primary transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="text-xs font-bold">Enregistrer une course hors plateforme</span>
        </Link>
      </div>
    </ChauffeurLayout>
  );
}