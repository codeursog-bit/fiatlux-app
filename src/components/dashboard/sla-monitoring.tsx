'use client';

import { ShieldCheck, Clock, Star, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardStats } from '@/hooks/use-deliveries';

export function SLAMonitoring() {
  const { data: stats, isLoading } = useDashboardStats();

  const metrics = [
    {
      label: 'Temps de prise en charge',
      value: stats?.avgPickupMinutes != null ? `${stats.avgPickupMinutes.toFixed(1)} min` : '—',
      sub: 'Moyenne sur 30 jours (assignation → collecte)',
      icon: Clock,
      available: stats?.avgPickupMinutes != null,
    },
    {
      label: 'Taux de complétion',
      value: stats?.completionRate != null ? `${stats.completionRate.toFixed(1)}%` : '—',
      sub: `${stats?.deliveredCount30d ?? 0} livrées / ${stats?.cancelledCount30d ?? 0} annulées (30 j)`,
      icon: CheckCircle2,
      available: stats?.completionRate != null,
    },
    {
      label: 'Satisfaction client',
      value: stats?.avgRating != null ? `${stats.avgRating.toFixed(1)} ★` : '—',
      sub: stats?.ratingsCount ? `Sur ${stats.ratingsCount} évaluation${stats.ratingsCount > 1 ? 's' : ''}` : 'Aucune évaluation reçue',
      icon: Star,
      available: stats?.avgRating != null,
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Suivi Qualité</h2>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Indicateurs calculés sur les commandes réelles.</p>
        </div>
        <ShieldCheck className="w-4 h-4 text-slate-400" />
      </div>

      <div className="p-2 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {metrics.map((metric) => (
              <div key={metric.label} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-full",
                    metric.available ? "bg-emerald-50 text-emerald-500" : "bg-slate-100 text-slate-400"
                  )}>
                    <metric.icon className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-700 leading-tight">{metric.label}</p>
                    <p className="text-[8px] text-slate-400 font-medium">{metric.sub}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-xs font-black",
                    metric.available ? "text-slate-900" : "text-slate-300"
                  )}>
                    {metric.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}