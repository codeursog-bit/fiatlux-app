'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { useDashboardStats } from '@/hooks/use-deliveries';

export function StatusDistribution() {
  const { data: stats, isLoading } = useDashboardStats();
  const data = stats?.statusDistribution || [];
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm relative">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-bold text-slate-900">Distribution par statut</h2>
        <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Répartition des commandes par état actuel.</p>
      </div>
      <div className="p-1">
        <div className="h-[160px] w-full relative">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="h-24 w-24 rounded-full bg-slate-50 animate-pulse" />
            </div>
          ) : !hasData ? (
            <div className="h-full w-full flex items-center justify-center">
              <p className="text-xs text-slate-400 font-medium">Aucune commande enregistrée.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '10px',
                    fontWeight: '600',
                    padding: '4px 8px'
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={24}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}