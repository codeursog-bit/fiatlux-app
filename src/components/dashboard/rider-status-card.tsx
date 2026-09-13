'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bike, Phone, MapPin, Loader2 } from 'lucide-react';
import { useRiders } from '@/hooks/use-deliveries';
import { cn } from '@/lib/utils';

export function RiderStatusCard() {
  const { data: riders, isLoading } = useRiders();

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Statut des livreurs</h2>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Disponibilité actuelle de l&apos;équipe en temps réel.</p>
        </div>
        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
      </div>
      <div className="p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-20"></div>
                  <div className="h-2 bg-slate-100 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))
        ) : !riders || riders.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8 font-medium">Aucun livreur enregistré.</p>
        ) : riders.map((rider) => (
          <div 
            key={rider.id} 
            className="flex items-center justify-between p-3 rounded border border-slate-100 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px]">
                {rider.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{rider.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-slate-500 font-medium tracking-wide uppercase">{rider.vehiclePlate}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span 
                className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                  rider.status === 'ACTIVE' 
                    ? 'bg-emerald-50 text-success border border-emerald-100' 
                    : rider.status === 'BUSY' 
                    ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                )}
              >
                {rider.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}