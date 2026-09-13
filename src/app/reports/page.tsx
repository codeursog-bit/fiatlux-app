'use client';

import * as React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  Calendar, 
  FileDown, 
  TrendingUp, 
  Filter, 
  ChevronDown,
  Download,
  Printer,
  Table as TableIcon,
  PieChart as PieChartIcon,
  BarChart3,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const PERIOD_TO_DAYS: Record<string, number> = {
  today: 1,
  '7d': 7,
  '30d': 30,
  // Pas encore de sélecteur de plage personnalisée — retombe sur 30j en
  // attendant, plutôt que d'inventer des données pour une plage qui
  // n'existe pas côté UI.
  custom: 30,
};

function useReportsData(days: number) {
  return useQuery({
    queryKey: ['admin', 'reports', days],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/reports', { params: { days } });
      return data as {
        dailyData: { date: string; deliveries: number; revenue: number; cancelled: number }[];
        statusData: { name: string; key: string; value: number; color: string }[];
        riderPerformance: { name: string; deliveries: number; rating: number }[];
        summary: { totalRevenue: number; totalDeliveries: number; totalOrders: number };
      };
    },
  });
}

export default function ReportsPage() {
  const [period, setPeriod] = React.useState('30d');
  const [isExporting, setIsExporting] = React.useState(false);
  const { data: report, isLoading: isReportLoading } = useReportsData(PERIOD_TO_DAYS[period] ?? 30);

  const dailyData = React.useMemo(
    () => (report?.dailyData || []).map((d) => ({ ...d, date: format(new Date(d.date), 'dd MMM', { locale: fr }) })),
    [report]
  );
  const statusData = report?.statusData || [];
  const riderPerformance = report?.riderPerformance || [];

  const successRate = report && report.summary.totalOrders > 0
    ? (((report.summary.totalOrders - (statusData.find(s => s.key === 'CANCELLED')?.value || 0) - (statusData.find(s => s.key === 'FAILED')?.value || 0)) / report.summary.totalOrders) * 100).toFixed(1)
    : null;

  const handleExport = (format: 'PDF' | 'CSV') => {
    // Export réel pas encore implémenté (nécessite une génération PDF/CSV
    // côté serveur) — volontairement laissé pour une itération suivante,
    // signalé clairement plutôt que fait semblant de fonctionner.
    toast.info(`Export ${format} — fonctionnalité à venir`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 bg-white -mx-4 md:-mx-6 px-4 md:px-6 py-4 -mt-4 md:-mt-6 mb-2">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Analyses & Rapports</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium italic">Consultez les performances opérationnelles et financières.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
              {[
                { id: 'today', label: 'Aujourd\'hui' },
                { id: '7d', label: '7j' },
                { id: '30d', label: '30j' },
                { id: 'custom', label: 'Perso.' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={cn(
                    "px-4 py-1.5 rounded text-[11px] font-black uppercase tracking-wider transition-all",
                    period === p.id 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className={cn(buttonVariants({ variant: "default" }), "bg-slate-900 text-white rounded-lg h-9 px-4 font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 shadow-sm border-none")}>
                {isExporting ? <Clock className="w-3.5 h-3.5 animate-spin mr-2" /> : <Download className="w-3.5 h-3.5 mr-2" />}
                Exporter
                <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-slate-200 p-2 min-w-[160px]">
                <DropdownMenuItem onClick={() => handleExport('PDF')} className="gap-2 font-bold text-xs p-3 rounded-lg">
                  <Printer className="w-4 h-4 text-slate-400" />
                  Format PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('CSV')} className="gap-2 font-bold text-xs p-3 rounded-lg">
                  <FileDown className="w-4 h-4 text-slate-400" />
                  Format CSV (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            label="Livraisons Totales" 
            value={report ? report.summary.totalDeliveries.toLocaleString() : '...'} 
            subtitle={`Sur les ${PERIOD_TO_DAYS[period] ?? 30} derniers jours`}
            className="border-none shadow-sm ring-1 ring-slate-200/60"
          />
          <StatsCard 
            label="Chiffre d'Affaires" 
            value={report ? `${report.summary.totalRevenue.toLocaleString()} FCFA` : '...'} 
            subtitle={report && report.summary.totalDeliveries > 0 ? `Panier moyen: ${Math.round(report.summary.totalRevenue / report.summary.totalDeliveries).toLocaleString()} FCFA` : undefined}
            className="border-none shadow-sm ring-1 ring-slate-200/60"
          />
          <StatsCard 
            label="Taux de Réussite" 
            value={successRate !== null ? `${successRate}%` : '...'} 
            subtitle="Livrées / total des commandes"
            className="border-none shadow-sm ring-1 ring-slate-200/60"
          />
          <StatsCard 
            label="Commandes (total)" 
            value={report ? report.summary.totalOrders.toLocaleString() : '...'} 
            subtitle="Toutes les commandes de la période"
            className="border-none shadow-sm ring-1 ring-slate-200/60"
          />
        </div>

        {/* Main Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deliveries Evolution */}
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 py-4 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Évolution des Livraisons</CardTitle>
                  <CardDescription className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider italic">Volume quotidien sur 30 jours</CardDescription>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="deliveries" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorDeliveries)" 
                    name="Livraisons"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Evolution */}
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 py-4 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Évolution du CA</CardTitle>
                  <CardDescription className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider italic">Revenus générés (FCFA)</CardDescription>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                    formatter={(value: any) => [`${value.toLocaleString()} FCFA`, 'CA']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4, strokeWidth: 0, fill: '#10b981' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Chiffre d'Affaires"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Distribution */}
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 py-4 px-6">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Distribution par Statut</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 h-[300px] flex flex-col items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center" 
                    iconType="circle"
                    formatter={(value) => <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Riders */}
          <Card className="lg:col-span-2 rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 py-4 px-6">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Performance des Livreurs (Top 5)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riderPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#334155', fontSize: 10, fontWeight: 800 }}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  />
                  <Bar 
                    dataKey="deliveries" 
                    fill="#3b82f6" 
                    radius={[0, 8, 8, 0]} 
                    barSize={24}
                    name="Livraisons"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Summary Table */}
        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-50 py-4 px-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Récapitulatif Détaillé</CardTitle>
              <CardDescription className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider italic">Données consolidées par période</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input 
                  placeholder="Rechercher..." 
                  className="h-9 pl-9 text-xs rounded-lg border-slate-200 w-[200px]"
                />
              </div>
              <Button variant="outline" size="sm" className="rounded-lg h-9 font-bold text-[10px] uppercase tracking-widest border-slate-200 text-slate-600">
                <Filter className="w-3 h-3 mr-2" />
                Colonnes
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Période</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Commandes</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue (FCFA)</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Annulations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dailyData.slice(-10).reverse().map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-300" />
                        <span className="text-xs font-black text-slate-700">{row.date}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs font-bold text-slate-600">{row.deliveries}</td>
                    <td className="py-4 px-6 text-xs font-bold text-slate-900">{row.revenue.toLocaleString()}</td>
                    <td className="py-4 px-6">
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                        row.cancelled > 5 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {row.cancelled} incidents
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
          <div className="p-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Affichage des 10 derniers jours consolidés</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg opacity-50 cursor-not-allowed">
                <ChevronDown className="w-4 h-4 rotate-90" />
              </Button>
              <span className="text-[10px] font-black text-slate-600">PAGE 1 / 3</span>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-slate-200">
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
