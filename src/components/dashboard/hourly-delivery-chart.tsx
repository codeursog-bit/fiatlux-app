'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useDashboardStats } from '@/hooks/use-deliveries';

export function HourlyDeliveryChart() {
  const { data: stats, isLoading } = useDashboardStats();
  const data = stats?.hourlyBreakdown || [];
  const peak = data.length ? Math.max(...data.map((d) => d.orders)) : 0;
  const hasData = data.some((d) => d.orders > 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex flex-col relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Livraisons par heure</h3>
          <p className="text-[10px] text-slate-400">Commandes créées aujourd&apos;hui, par tranche horaire.</p>
        </div>
        {!isLoading && (
          <span className="text-[10px] font-semibold text-fiatlux-primary bg-slate-100 px-2 py-0.5 rounded">
            Pic horaire : {peak}
          </span>
        )}
      </div>

      <div className="h-[180px] w-full mt-1 relative">
        {isLoading ? (
          <div className="h-full w-full bg-slate-50 rounded animate-pulse" />
        ) : !hasData ? (
          <div className="h-full w-full flex items-center justify-center">
            <p className="text-xs text-slate-400 font-medium">Aucune commande aujourd&apos;hui pour le moment.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F4C81" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#0F4C81" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 500 }}
                dy={5}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 500 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '10px',
                  fontWeight: '600',
                  padding: '4px 8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="#0F4C81"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorOrders)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}