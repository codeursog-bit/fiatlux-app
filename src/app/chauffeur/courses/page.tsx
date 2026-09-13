'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, MapPin, ChevronRight, Package } from 'lucide-react';
import { ChauffeurLayout } from '@/components/layout/chauffeur-layout';
import { useMyOrders, useMyOrderHistory } from '@/hooks/use-rider-portal';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
  FAILED: 'Échec',
};

const STATUS_STYLES: Record<string, string> = {
  DELIVERED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
  FAILED: 'bg-red-50 text-red-600 border-red-100',
};

export default function ChauffeurCoursesPage() {
  const { data: activeOrders, isLoading: activeLoading } = useMyOrders();
  const { data: history, isLoading: historyLoading } = useMyOrderHistory();

  return (
    <ChauffeurLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-black text-slate-900">Mes courses</h1>
          <p className="text-xs text-slate-500 font-medium">Actives et historique</p>
        </div>

        <div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">En cours</h2>
          {activeLoading ? (
            <div className="h-16 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-fiatlux-primary" /></div>
          ) : !activeOrders || activeOrders.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3">Aucune course active.</p>
          ) : (
            <div className="space-y-2">
              {activeOrders.map((order: any) => (
                <Link
                  key={order.id}
                  href={`/chauffeur/courses/${order.id}`}
                  className="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-slate-900">{order.trackingNumber}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                    <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>{order.pickupAddress} → {order.dropoffAddress}</span>
                  </div>
                  <p className="text-xs font-black text-fiatlux-primary mt-1">{order.amount?.toLocaleString()} FCFA</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Historique</h2>
          {historyLoading ? (
            <div className="h-16 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-fiatlux-primary" /></div>
          ) : !history?.orders || history.orders.length === 0 ? (
            <div className="text-center py-10">
              <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400 italic">Aucune course terminée.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.orders.map((order: any) => (
                <Link
                  key={order.id}
                  href={`/chauffeur/courses/${order.id}`}
                  className="block bg-white border border-slate-200 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-slate-700">{order.trackingNumber}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-[9px] font-black uppercase px-2 py-0.5 rounded border', STATUS_STYLES[order.status])}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {format(new Date(order.updatedAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </p>
                  <p className="text-xs font-black text-slate-900 mt-1">{order.amount?.toLocaleString()} FCFA</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ChauffeurLayout>
  );
}