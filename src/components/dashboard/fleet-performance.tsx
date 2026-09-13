'use client';

import { Trophy, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardStats } from '@/hooks/use-deliveries';

export function FleetPerformance() {
  const { data: stats, isLoading } = useDashboardStats();
  const topRiders = stats?.topRiders || [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Performance Flotte</h2>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Meilleurs livreurs des 7 derniers jours.</p>
        </div>
        <Trophy className="w-4 h-4 text-slate-400" />
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded p-2 border border-slate-100">
            <div className="flex items-center gap-1 mb-0.5">
              <Clock className="w-2.5 h-2.5 text-slate-400" />
              <span className="text-[8px] font-bold text-slate-500 uppercase">Prise en charge</span>
            </div>
            <p className="text-xs font-bold text-slate-900">
              {stats?.avgPickupMinutes != null ? `${stats.avgPickupMinutes.toFixed(1)} min` : '—'}
            </p>
          </div>
          <div className="bg-slate-50 rounded p-2 border border-slate-100">
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingUp className="w-2.5 h-2.5 text-slate-400" />
              <span className="text-[8px] font-bold text-slate-500 uppercase">Complétion</span>
            </div>
            <p className="text-xs font-bold text-slate-900">
              {stats?.completionRate != null ? `${stats.completionRate.toFixed(1)}%` : '—'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-slate-50 animate-pulse" />
            ))
          ) : topRiders.length === 0 ? (
            <p className="text-[10px] text-slate-400 text-center py-4 font-medium">
              Aucune livraison complétée cette semaine.
            </p>
          ) : (
            topRiders.map((rider, idx) => (
              <div
                key={rider.id}
                className="flex items-center justify-between p-2 rounded border border-slate-50 hover:border-slate-100 hover:bg-slate-50 transition-all cursor-default"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-300 w-3">{idx + 1}</span>
                  <div>
                    <p className="text-[10px] font-bold text-slate-800 leading-tight">{rider.name}</p>
                    <span className="text-[8px] font-medium text-slate-400">{rider.deliveries} livraison{rider.deliveries > 1 ? 's' : ''}</span>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-900">
                  {rider.rating != null ? `${rider.rating.toFixed(1)} ★` : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}