'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useDashboardStats } from '@/hooks/use-deliveries';

export function DeliveryOverview() {
  const { data: stats, isLoading } = useDashboardStats();
  const data = stats?.weeklyRevenue || [];
  const hasData = data.some((d) => d.total > 0);
  const totalWeek = data.reduce((sum, d) => sum + d.total, 0);
  const avgPerDay = data.length ? Math.round(totalWeek / data.length) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex flex-col relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Revenus des 7 derniers jours</h3>
          <p className="text-[10px] text-slate-400">Somme des commandes livrées, par jour.</p>
        </div>
        {!isLoading && hasData && (
          <span className="text-[10px] font-semibold text-fiatlux-success bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
            Moyenne : {avgPerDay.toLocaleString('fr-FR')} FCFA/j
          </span>
        )}
      </div>

      <div className="h-[180px] w-full mt-1 relative">
        {isLoading ? (
          <div className="h-full w-full bg-slate-50 rounded animate-pulse" />
        ) : !hasData ? (
          <div className="h-full w-full flex items-center justify-center">
            <p className="text-xs text-slate-400 font-medium">Aucune livraison réglée cette semaine.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 600 }}
                dy={5}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 9 }}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc', radius: 4 }}
                formatter={(value: number) => [`${value.toLocaleString('fr-FR')} FCFA`, 'Revenus']}
                contentStyle={{
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '10px',
                  fontWeight: '600',
                  padding: '4px 8px'
                }}
              />
              <Bar dataKey="total" radius={[2, 2, 0, 0]} barSize={24}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === data.length - 1 ? '#0F4C81' : '#e2e8f0'}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}