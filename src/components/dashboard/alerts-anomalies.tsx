'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAlerts } from '@/hooks/use-deliveries';
import { Alert } from '@/types';
import { AlertCircle, MapPin, SignalLow, Wallet, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const alertBorderColors: Record<Alert['type'], string> = {
  STALL: 'border-red-500 bg-red-50/50',
  DEVIATION: 'border-amber-500 bg-amber-50/50',
  OFFLINE: 'border-slate-400 bg-slate-50',
  PAYMENT: 'border-blue-500 bg-blue-50/50',
};

const badgeColors: Record<Alert['type'], string> = {
  STALL: 'bg-red-100 text-red-800',
  DEVIATION: 'bg-amber-100 text-amber-800',
  OFFLINE: 'bg-slate-200 text-slate-800',
  PAYMENT: 'bg-blue-100 text-blue-800',
};

const actionLabels: Record<Alert['type'], string> = {
  STALL: 'Contacter',
  DEVIATION: 'Recalculer',
  OFFLINE: 'Vérifier',
  PAYMENT: 'Approuver',
};

export function AlertsAnomalies() {
  const { data: alerts, isLoading } = useAlerts();

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-fiatlux-danger animate-pulse" />
          <h2 className="text-sm font-bold text-slate-900">Alertes et anomalies du jour</h2>
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
        </div>
        <span className="text-[10px] text-fiatlux-danger font-bold bg-red-50 px-2 py-0.5 rounded uppercase tracking-wider">
          Action Requise ({alerts?.length || 0})
        </span>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-l-4 border-slate-100 p-4 rounded-r-md bg-slate-50 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-100 rounded w-full mb-1"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))
        ) : alerts?.map((alert: Alert) => (
          <div 
            key={alert.id} 
            className={cn(
              "border-l-4 p-4 rounded-r-md transition-shadow hover:shadow-sm",
              alertBorderColors[alert.type]
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">{alert.title}</span>
              <span className={cn("text-[9px] px-1.5 rounded font-mono font-bold", badgeColors[alert.type])}>
                {alert.duration}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
              {alert.description}
            </p>
            <button className="text-[10px] font-bold text-fiatlux-primary mt-2 block hover:underline transition-all">
              {actionLabels[alert.type]}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
