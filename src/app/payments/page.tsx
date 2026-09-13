'use client';

import * as React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { usePayments, useRecordCashPayment } from '@/hooks/use-payments';
import { PaymentDistributionChart } from '@/components/payments/payment-distribution-chart';
import { 
  CreditCard, 
  Wallet, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  ArrowUpRight, 
  MoreVertical, 
  Eye, 
  Download,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  TrendingUp,
  Banknote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'motion/react';
import Link from 'next/link';

export default function PaymentsPage() {
  const { data, isLoading } = usePayments();
  const recordCashPayment = useRecordCashPayment();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [methodFilter, setMethodFilter] = React.useState<'ALL' | 'ONLINE' | 'CASH'>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'PAID' | 'PENDING' | 'FAILED'>('ALL');

  const stats = data?.stats;

  const handleRecordCash = (orderId: string) => {
    recordCashPayment.mutate(orderId);
  };

  const filteredTransactions = React.useMemo(() => {
    const transactions = data?.transactions || [];
    return transactions.filter(t => {
      const matchesSearch = t.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMethod = methodFilter === 'ALL' || t.method === methodFilter;
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [data?.transactions, searchQuery, methodFilter, statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded">
            Payé
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-amber-50 text-amber-600 border-amber-100 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded">
            En attente
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge className="bg-red-50 text-red-600 border-red-100 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded">
            Échoué
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Paiements</h1>
            <p className="text-slate-500 font-medium mt-1">Suivez les transactions et la trésorerie en temps réel.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="h-11 px-6 rounded-xl border-slate-200 font-bold text-slate-600 gap-2">
              <Download className="w-4 h-4" />
              Exporter (CSV)
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Encaissé (Aujourd&apos;hui)</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">
                    {formatCurrency(stats?.totalCollectedToday || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-500" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">En attente</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{stats?.pendingPayments || 0}</span>
                  <span className="text-xs font-bold text-slate-500">paiements</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-fiatlux-primary" />
                </div>
                <div className="flex gap-2">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-fiatlux-primary">{stats?.platformPercentage}% Plateforme</span>
                    <span className="text-[10px] font-black text-emerald-600">{stats?.cashPercentage}% Espèces</span>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Mix de paiement</h3>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 flex overflow-hidden">
                  <div className="h-full bg-fiatlux-primary" style={{ width: `${stats?.platformPercentage}%` }}></div>
                  <div className="h-full bg-emerald-500" style={{ width: `${stats?.cashPercentage}%` }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Impayés / Échecs</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-red-600">
                    {formatCurrency(stats?.overdueAmount || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
              <div className="p-8 border-b border-slate-50 bg-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        placeholder="N° Commande, client..." 
                        className="h-12 pl-12 rounded-xl border-slate-200 focus:ring-fiatlux-primary/20 font-medium"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100">
                      <button 
                        onClick={() => setMethodFilter('ALL')}
                        className={cn(
                          "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                          methodFilter === 'ALL' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Tous
                      </button>
                      <button 
                        onClick={() => setMethodFilter('ONLINE')}
                        className={cn(
                          "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                          methodFilter === 'ONLINE' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        En ligne
                      </button>
                      <button 
                        onClick={() => setMethodFilter('CASH')}
                        className={cn(
                          "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                          methodFilter === 'CASH' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Espèces
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-0">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-fiatlux-primary animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Récupération des transactions...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-slate-50">
                        <TableHead className="pl-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Commande</TableHead>
                        <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Client</TableHead>
                        <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Mode</TableHead>
                        <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Statut</TableHead>
                        <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Montant</TableHead>
                        <TableHead className="pr-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Date</TableHead>
                        <TableHead className="pr-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((t) => (
                        <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                          <TableCell className="pl-8 py-5">
                            <Link href={`/deliveries/${t.orderId}`} className="text-sm font-black text-fiatlux-primary hover:underline">
                              {t.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="py-5">
                            <span className="text-sm font-bold text-slate-700">{t.customerName}</span>
                          </TableCell>
                          <TableCell className="py-5">
                            <div className="flex items-center gap-2">
                              {t.method === 'ONLINE' ? (
                                <CreditCard className="w-4 h-4 text-fiatlux-primary" />
                              ) : (
                                <Banknote className="w-4 h-4 text-emerald-500" />
                              )}
                              <span className="text-xs font-bold text-slate-500">
                                {t.method === 'ONLINE' ? 'Plateforme' : 'Espèces'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-5 text-center">
                            {getStatusBadge(t.status)}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-slate-900">
                            {formatCurrency(t.amount)}
                          </TableCell>
                          <TableCell className="pr-8 py-5 text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              {format(new Date(t.date), 'dd MMM, HH:mm', { locale: fr })}
                            </span>
                          </TableCell>
                          <TableCell className="pr-8 py-5 text-right">
                            {t.method === 'CASH' && t.status !== 'PAID' ? (
                              <Button
                                size="sm"
                                onClick={() => handleRecordCash(t.orderId)}
                                disabled={recordCashPayment.isPending}
                                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase gap-1.5"
                              >
                                {recordCashPayment.isPending && recordCashPayment.variables === t.orderId ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Banknote className="w-3 h-3" />
                                )}
                                Marquer payé
                              </Button>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {!isLoading && filteredTransactions.length === 0 && (
                  <div className="text-center py-24">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                      <Wallet className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Aucune transaction</h3>
                    <p className="text-slate-500 mt-2 max-w-xs mx-auto">
                      Ajustez vos filtres pour trouver ce que vous cherchez.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar Charts/Info */}
          <div className="space-y-8">
            <PaymentDistributionChart data={stats?.weeklyByMethod || []} isLoading={isLoading} />

            <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
              <CardContent className="p-8">
                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">Résumé de la semaine</h3>
                <p className="text-slate-500 text-sm font-medium mb-6">Total encaissé, plateforme et espèces confondues.</p>
                <p className="text-3xl font-black text-slate-900 mb-6">
                  {formatCurrency((stats?.weeklyByMethod || []).reduce((sum, d) => sum + d.platform + d.cash, 0))}
                </p>
                <Link href="/reports">
                  <Button variant="outline" className="w-full h-12 rounded-xl border-slate-200 font-bold text-slate-600 gap-2">
                    Voir les rapports détaillés
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}