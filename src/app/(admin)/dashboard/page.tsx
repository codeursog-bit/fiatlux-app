'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { 
  Package, 
  Bike, 
  CheckCircle2, 
  Clock,
  Search, 
  Filter, 
  FileDown, 
  TrendingUp, 
  AlertTriangle, 
  Star,
  CreditCard
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { DeliveryOverview } from '@/components/dashboard/delivery-overview';
import { RecentDeliveries } from '@/components/dashboard/recent-deliveries';
import { LiveMapPreview } from '@/components/dashboard/live-map-preview';
import { RiderStatusCard } from '@/components/dashboard/rider-status-card';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { StatusDistribution } from '@/components/dashboard/status-distribution';
import { LiveActivityFeed } from '@/components/dashboard/live-activity-feed';
import { HourlyDeliveryChart } from '@/components/dashboard/hourly-delivery-chart';
import { AlertsAnomalies } from '@/components/dashboard/alerts-anomalies';
import { FleetPerformance } from '@/components/dashboard/fleet-performance';
import { OperationsContext } from '@/components/dashboard/operations-context';
import { SLAMonitoring } from '@/components/dashboard/sla-monitoring';
import { useDashboardStats } from '@/hooks/use-deliveries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <DashboardLayout>
      <div className="space-y-3">
        
        {/* Page Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 bg-white -mx-4 md:-mx-6 px-4 md:px-6 py-2 md:py-3 -mt-4 md:-mt-6 mb-2 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight uppercase tracking-widest">Tableau de bord</h1>
            <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 font-medium">Suivi en direct et indicateurs d&apos;activité.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:space-x-2">
            <span className="text-[10px] text-slate-400 mr-1 md:mr-2 flex items-center space-x-1 font-medium order-last md:order-first w-full md:w-auto mt-2 md:mt-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-fiatlux-success animate-pulse"></span>
              <span>Synchronisation en direct</span>
            </span>
            <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-[11px] font-bold inline-flex items-center space-x-1.5 transition-colors flex-1 md:flex-none justify-center shadow-sm uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filtrer</span>
            </button>
            <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-[11px] font-bold inline-flex items-center space-x-1.5 transition-colors flex-1 md:flex-none justify-center shadow-sm uppercase tracking-wider">
              <FileDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Exporter</span>
            </button>
          </div>
        </div>

        {/* 1. KPI Grid (6 Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatsCard 
            label="Livraisons du jour" 
            value={stats?.completedToday ?? 0} 
            trend={stats?.completedTodayTrend != null ? `${stats.completedTodayTrend > 0 ? '+' : ''}${stats.completedTodayTrend.toFixed(0)}%` : undefined}
            trendType={stats?.completedTodayTrend != null && stats.completedTodayTrend < 0 ? 'down' : 'up'}
            subtitle={stats?.completedTodayTrend == null ? 'vs hier : n/a' : undefined}
          />
          <StatsCard 
            label="Livraisons actives" 
            value={stats?.pendingDeliveries ?? 0} 
            badgeClass="bg-fiatlux-success animate-pulse h-2 w-2 p-0 rounded-full"
            badgeText=" "
            subtitle="En cours de route"
          />
          <StatsCard 
            label="Livreurs dispo." 
            value={stats?.activeRiders ?? 0} 
            badgeText={`${stats?.activeRiders ?? 0} Actifs`}
            badgeClass="text-fiatlux-primary font-bold bg-blue-50"
            subtitle="En mission"
          />
          <StatsCard 
            label="Total Livraisons" 
            value={stats?.totalDeliveries ?? 0} 
            badgeText="Cumul" 
            badgeClass="bg-emerald-50 text-fiatlux-success border border-emerald-100"
            subtitle="Toutes périodes"
          />
          <StatsCard 
            label="Alertes actives" 
            value={stats?.activeAlerts ?? 0} 
            badgeText={stats?.activeAlerts ? "À traiter" : "RAS"}
            badgeClass={stats?.activeAlerts ? "bg-red-50 text-fiatlux-danger border border-red-100 font-bold" : "bg-slate-100 text-slate-500"}
            subtitle="Non résolues"
          />
          <StatsCard 
            label="Satisfaction client" 
            value={stats?.avgRating != null ? `${stats.avgRating.toFixed(1)} ★` : '—'}
            badgeText={stats?.ratingsCount ? `${stats.ratingsCount} avis` : 'Aucun avis'}
            badgeClass="bg-amber-50 text-amber-700 border border-amber-100"
          />
        </div>

        {/* 2. Map & Activity Section */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          <div className="xl:col-span-8 h-full">
            <LiveMapPreview />
          </div>
          <div className="xl:col-span-4 h-full">
            <LiveActivityFeed />
          </div>
        </div>

        {/* 3. Analytics Charts & Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 space-y-3">
            <HourlyDeliveryChart />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DeliveryOverview />
              <StatusDistribution />
            </div>
          </div>
          <div className="space-y-3">
            <OperationsContext />
            <SLAMonitoring />
          </div>
        </div>

        {/* 4. Quick Actions & Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <QuickActions />
          <FleetPerformance />
        </div>

        {/* 5. Riders & Recent Orders */}
        <div className="grid grid-cols-1 xl:grid-cols-10 gap-3">
          <div className="xl:col-span-3">
            <RiderStatusCard />
          </div>
          <div className="xl:col-span-7">
            <RecentDeliveries />
          </div>
        </div>

        {/* 5. Alerts Panel */}
        <AlertsAnomalies />

      </div>
    </DashboardLayout>
  );
}