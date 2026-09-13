'use client';

import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  badgeText?: string;
  badgeClass?: string;
  trend?: string;
  trendType?: 'up' | 'down';
  subtitle?: string;
  className?: string;
}

export function StatsCard({
  label,
  value,
  badgeText,
  badgeClass = "bg-slate-100 text-slate-600",
  trend,
  trendType = 'up',
  subtitle,
  className,
}: StatsCardProps) {
  return (
    <div className={cn("bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between h-full", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        {badgeText && (
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", badgeClass)}>
            {badgeText}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-slate-900 leading-tight">{value}</span>
        {trend && (
          <span className={cn(
            "text-[11px] font-medium flex items-center",
            trendType === 'up' ? "text-fiatlux-success" : "text-fiatlux-danger"
          )}>
            {trendType === 'up' ? (
              <TrendingUp className="w-3 h-3 mr-0.5" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-0.5" />
            )}
            {trend}
          </span>
        )}
        {subtitle && !trend && (
          <span className="text-[11px] text-slate-400">{subtitle}</span>
        )}
      </div>
      {subtitle && trend && (
        <span className="text-[10px] text-slate-500 mt-1">{subtitle}</span>
      )}
    </div>
  );
}