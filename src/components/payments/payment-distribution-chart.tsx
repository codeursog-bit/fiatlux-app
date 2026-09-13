'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface PaymentDistributionChartProps {
  data: { name: string; platform: number; cash: number }[];
  isLoading?: boolean;
}

export function PaymentDistributionChart({ data, isLoading }: PaymentDistributionChartProps) {
  const hasData = data.some((d) => d.platform > 0 || d.cash > 0);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Répartition des paiements</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">7 derniers jours</p>
        </div>
      </div>

      {/* Hauteur fixe volontaire : un conteneur en h-full/flex-1 sans ancêtre
          de hauteur définie fait grandir ResponsiveContainer indéfiniment
          vers le bas (boucle de mesure recharts × flexbox). */}
      <div className="h-[260px] w-full">
        {isLoading ? (
          <div className="h-full w-full bg-slate-50 rounded-2xl animate-pulse" />
        ) : !hasData ? (
          <div className="h-full w-full flex items-center justify-center">
            <p className="text-xs text-slate-400 font-medium">Aucun paiement réglé cette semaine.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                tickFormatter={(value) => `${value / 1000}k`}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`}
                contentStyle={{
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  padding: '12px'
                }}
                itemStyle={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}
              />
              <Bar
                dataKey="platform"
                name="Plateforme"
                fill="#0F4C81"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
              <Bar
                dataKey="cash"
                name="Espèces"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}