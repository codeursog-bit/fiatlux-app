'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDeliveries } from '@/hooks/use-deliveries';
import { OrderStatus } from '@/types';
import { STATUS_COLORS, ORDER_STATUS_LABELS } from '@/constants';
import { cn } from '@/lib/utils';
import { 
  MoreHorizontal, 
  MapPin, 
  User, 
  ArrowRight,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export function RecentDeliveries() {
  const { data: deliveries, isLoading } = useDeliveries();
  const PAGE_SIZE = 3;
  const [page, setPage] = React.useState(0);

  const totalPages = deliveries ? Math.max(1, Math.ceil(deliveries.length / PAGE_SIZE)) : 1;
  // Si un filtrage futur réduit la liste, on évite de rester bloqué sur une
  // page qui n'existe plus.
  const safePage = Math.min(page, totalPages - 1);
  const paginatedDeliveries = deliveries?.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE) ?? [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 leading-tight">Commandes récentes et fiches d&apos;expédition</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Statut de la répartition et de l&apos;affectation en temps réel.</p>
        </div>
        <div className="flex items-center space-x-2">
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filtrer..." 
              className="border border-slate-200 rounded pl-7 pr-2 py-0.5 text-[10px] focus:outline-none focus:border-fiatlux-primary bg-slate-50 w-32 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[200px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-500 uppercase tracking-tight">
              <th className="py-2 px-3">ID</th>
              <th className="py-2 px-3">Client</th>
              <th className="py-2 px-3 hidden md:table-cell">Livreur</th>
              <th className="py-2 px-3 hidden lg:table-cell">Collecte</th>
              <th className="py-2 px-3 hidden lg:table-cell">Dest.</th>
              <th className="py-2 px-3 text-center">Statut</th>
              <th className="py-2 px-3 text-right">Montant</th>
              <th className="py-2 px-3 text-right hidden sm:table-cell">ETA</th>
              <th className="py-2 px-3 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px]">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={9} className="py-4 px-3">
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                  </td>
                </tr>
              ))
            ) : paginatedDeliveries.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 px-3 text-center text-slate-400 text-xs font-medium">
                  Aucune commande pour le moment.
                </td>
              </tr>
            ) : paginatedDeliveries.map((delivery) => (
              <tr key={delivery.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-2 px-3 font-mono font-bold text-slate-900">{delivery.trackingNumber}</td>
                <td className="py-2 px-3 font-medium text-slate-800">
                  <div className="flex flex-col">
                    <span className="truncate max-w-[120px]">{delivery.customer?.name || delivery.guestCustomerName || '—'}</span>
                    <span className="text-[9px] text-slate-400 md:hidden">{delivery.rider?.name || '—'}</span>
                  </div>
                </td>
                <td className={cn(
                  "py-2 px-3 hidden md:table-cell truncate max-w-[100px]",
                  delivery.rider ? "text-slate-600" : "text-slate-400 italic"
                )}>
                  {delivery.rider?.name || '—'}
                </td>
                <td className="py-2 px-3 text-slate-500 hidden lg:table-cell truncate max-w-[120px]">{delivery.pickupAddress}</td>
                <td className="py-2 px-3 text-slate-500 hidden lg:table-cell truncate max-w-[120px]">{delivery.dropoffAddress}</td>
                <td className="py-2 px-3 text-center">
                  <span className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border whitespace-nowrap",
                    delivery.status === OrderStatus.IN_TRANSIT ? "bg-blue-50 text-blue-700 border-blue-100" :
                    delivery.status === OrderStatus.DELIVERED ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    delivery.status === OrderStatus.PICKED_UP ? "bg-amber-50 text-amber-700 border-amber-100" :
                    delivery.status === OrderStatus.ASSIGNED ? "bg-purple-50 text-purple-700 border-purple-100" :
                    delivery.status === OrderStatus.CANCELLED ? "bg-red-50 text-red-700 border-red-100" :
                    "bg-slate-100 text-slate-700 border-slate-200"
                  )}>
                    {ORDER_STATUS_LABELS[delivery.status] || delivery.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                  {delivery.amount.toLocaleString('fr-FR')}
                </td>
                <td className="py-2 px-3 text-right text-slate-500 font-medium hidden sm:table-cell">
                  {delivery.eta || '—'}
                </td>
                <td className="py-2 px-3 text-center">
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                    <MoreHorizontal className="w-3.5 h-3.5 mx-auto" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[10px] text-slate-500">
        <span>{deliveries?.length ?? 0} commande{(deliveries?.length ?? 0) > 1 ? 's' : ''}</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span>Page {safePage + 1} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="p-1 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Page précédente"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="p-1 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Page suivante"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}