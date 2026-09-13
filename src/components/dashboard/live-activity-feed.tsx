'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActivities } from '@/hooks/use-deliveries';
import { Activity } from '@/types';
import { 
  Package, 
  CheckCircle2, 
  CreditCard, 
  UserPlus, 
  Key, 
  User,
  MapPin,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const colorDotMap: Record<Activity['type'], string> = {
  PICKUP: 'bg-amber-500',
  DELIVERY: 'bg-emerald-500',
  PAYMENT: 'bg-fiatlux-primary',
  ASSIGN: 'bg-blue-500',
  VALIDATION: 'bg-emerald-500',
  ACCOUNT: 'bg-slate-400',
};

const badgeColorMap: Record<Activity['type'], string> = {
  PICKUP: 'bg-amber-50 text-amber-700 border-amber-100',
  DELIVERY: 'bg-emerald-50 text-success border-emerald-100',
  PAYMENT: 'bg-slate-100 text-slate-600 border-slate-200',
  ASSIGN: 'bg-blue-50 text-blue-700 border-blue-100',
  VALIDATION: 'bg-emerald-50 text-success border-emerald-100',
  ACCOUNT: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function LiveActivityFeed() {
  const { data: activities, isLoading } = useActivities();

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden h-[450px]">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Fil d&apos;activité en direct</h2>
        <div className="flex items-center space-x-2">
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Défilement auto.</span>
        </div>
      </div>
      
      <div className="p-5 divide-y divide-slate-100 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-100">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="py-2.5 flex items-start space-x-3 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-slate-100 mt-1.5 shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-3/4"></div>
                <div className="h-2 bg-slate-100 rounded w-1/2"></div>
              </div>
            </div>
          ))
        ) : !activities || activities.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8 font-medium">Aucune activité récente.</p>
        ) : activities.map((activity) => (
          <div key={activity.id} className="py-2.5 flex items-start space-x-3 text-xs group">
            <div className={cn(
              "w-2 h-2 rounded-full mt-1.5 shrink-0 transition-transform group-hover:scale-125",
              colorDotMap[activity.type]
            )}></div>
            <div className="flex-1">
              <div className="text-slate-800 font-medium">
                {activity.description.includes(activity.title) ? (
                  <span>{activity.description}</span>
                ) : (
                  <>
                    {activity.title} <span className="font-semibold text-slate-900">{activity.description}</span>
                  </>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {activity.timestamp} • {activity.location}
              </span>
            </div>
            <span className={cn(
              "text-[10px] border px-1.5 py-0.5 rounded font-medium whitespace-nowrap",
              badgeColorMap[activity.type]
            )}>
              {activity.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}