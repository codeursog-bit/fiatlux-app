'use client';

import * as React from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useDisputes, useResolveDispute } from '@/hooks/use-disputes';
import {
  ShieldAlert,
  Package,
  Wallet,
  MessageSquareWarning,
  CheckCircle2,
  Loader2,
  Hash,
  ExternalLink,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Dispute } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_CONFIG: Record<Dispute['type'], { label: string; icon: any; color: string }> = {
  PICKUP_MISMATCH: { label: 'Collecte non confirmée', icon: Package, color: 'text-amber-600 bg-amber-50' },
  DROPOFF_MISMATCH: { label: 'Livraison non confirmée', icon: Package, color: 'text-orange-600 bg-orange-50' },
  PAYMENT_MISMATCH: { label: 'Paiement contesté', icon: Wallet, color: 'text-red-600 bg-red-50' },
  POST_DELIVERY_CLAIM: { label: 'Réclamation post-livraison', icon: MessageSquareWarning, color: 'text-purple-600 bg-purple-50' },
};

const TYPE_FILTERS = [
  { id: 'ALL', label: 'Tous' },
  { id: 'PICKUP_MISMATCH', label: 'Collecte' },
  { id: 'DROPOFF_MISMATCH', label: 'Livraison' },
  { id: 'PAYMENT_MISMATCH', label: 'Paiement' },
  { id: 'POST_DELIVERY_CLAIM', label: 'Réclamations' },
];

function ResolveDialog({ dispute }: { dispute: Dispute }) {
  const [open, setOpen] = React.useState(false);
  const [resolution, setResolution] = React.useState('');
  const [forceStatus, setForceStatus] = React.useState('');
  const resolveDispute = useResolveDispute();

  const handleResolve = async () => {
    if (!resolution.trim()) {
      toast.error('Décrivez comment ce litige a été traité');
      return;
    }
    try {
      await resolveDispute.mutateAsync({
        id: dispute.id,
        resolution: resolution.trim(),
        forceStatus: forceStatus || undefined,
      });
      toast.success('Litige résolu.');
      setOpen(false);
      setResolution('');
      setForceStatus('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Impossible de résoudre ce litige');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: 'ghost' }), 'h-9 px-4 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-black text-[10px] uppercase tracking-widest')}>
        Résoudre
      </DialogTrigger>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-black">Résoudre le litige — {dispute.order.trackingNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{TYPE_CONFIG[dispute.type].label}</p>
            <p className="text-sm text-slate-700">{dispute.description}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600">Comment ce litige a-t-il été traité ?</Label>
            <Textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Ex : chauffeur contacté par téléphone, confirme avoir bien livré à 14h32. Fausse alerte."
              className="min-h-[90px] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600">Corriger le statut de la commande (optionnel)</Label>
            <select
              value={forceStatus}
              onChange={(e) => setForceStatus(e.target.value)}
              className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium"
            >
              <option value="">Ne rien changer</option>
              <option value="PICKED_UP">Colis récupéré</option>
              <option value="AT_DROPOFF">Chauffeur à destination</option>
              <option value="DELIVERED">Livrée</option>
              <option value="CANCELLED">Annulée</option>
            </select>
            <p className="text-[10px] text-slate-400">
              Utile si l&apos;enquête montre que le statut réel de la commande est différent de ce qu&apos;affiche l&apos;app.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleResolve}
            disabled={resolveDispute.isPending}
            className="w-full h-11 bg-fiatlux-primary hover:bg-[#0d4270] font-black text-xs uppercase tracking-widest"
          >
            {resolveDispute.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Marquer comme résolu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DisputesPage() {
  const [statusFilter, setStatusFilter] = React.useState<'OPEN' | 'RESOLVED'>('OPEN');
  const [typeFilter, setTypeFilter] = React.useState('ALL');

  const { data, isLoading } = useDisputes({ status: statusFilter, type: typeFilter });
  const disputes: Dispute[] = data?.disputes || [];

  const pickupCount = disputes.filter((d: Dispute) => d.type === 'PICKUP_MISMATCH').length;
  const dropoffCount = disputes.filter((d: Dispute) => d.type === 'DROPOFF_MISMATCH').length;
  const paymentCount = disputes.filter((d: Dispute) => d.type === 'PAYMENT_MISMATCH').length;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Litiges
              {isLoading && <Loader2 className="w-6 h-6 animate-spin text-slate-400" />}
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Écarts détectés automatiquement entre les confirmations client et chauffeur — à vérifier et clôturer.
            </p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Litiges affichés</p>
                  <p className="text-3xl font-black text-slate-900">{disputes.length}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Collecte</p>
              <p className="text-3xl font-black text-amber-600">{pickupCount}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Livraison</p>
              <p className="text-3xl font-black text-orange-600">{dropoffCount}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Paiement</p>
              <p className="text-3xl font-black text-red-600">{paymentCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Table */}
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100">
                  <button
                    onClick={() => setStatusFilter('OPEN')}
                    className={cn(
                      'px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all',
                      statusFilter === 'OPEN' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    )}
                  >
                    Ouverts
                  </button>
                  <button
                    onClick={() => setStatusFilter('RESOLVED')}
                    className={cn(
                      'px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all',
                      statusFilter === 'RESOLVED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    )}
                  >
                    Résolus
                  </button>
                </div>

                <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100 overflow-x-auto no-scrollbar">
                  {TYPE_FILTERS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTypeFilter(t.id)}
                      className={cn(
                        'px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap',
                        typeFilter === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-12 h-12 text-fiatlux-primary animate-spin mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Chargement des litiges...</p>
              </div>
            ) : disputes.length > 0 ? (
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-50">
                    <TableHead className="pl-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest w-[18%]">Type</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest w-[38%]">Description</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest w-[20%]">Commande</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest w-[14%]">Ouvert le</TableHead>
                    <TableHead className="pr-8 py-5 text-right w-[10%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes.map((dispute: Dispute) => {
                    const config = TYPE_CONFIG[dispute.type];
                    const Icon = config.icon;
                    return (
                      <TableRow key={dispute.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                        <TableCell className="pl-8 py-5 align-top">
                          <div className="flex items-start gap-3">
                            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', config.color)}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-black text-slate-900 break-words">{config.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-5 align-top overflow-hidden">
                          <p className="text-xs font-medium text-slate-600 leading-relaxed break-words whitespace-normal">{dispute.description}</p>
                          {dispute.status === 'RESOLVED' && dispute.resolution && (
                            <p className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-start gap-1 break-words whitespace-normal">
                              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" /> <span className="break-words">{dispute.resolution}</span>
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="py-5 align-top">
                          <Link href={`/orders/${dispute.orderId}`} className="flex items-center gap-1.5 text-fiatlux-primary hover:underline min-w-0">
                            <Hash className="w-3 h-3 shrink-0" />
                            <span className="text-xs font-black truncate">{dispute.order.trackingNumber}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </Link>
                          <Badge variant="outline" className="mt-1.5 text-[9px] font-bold uppercase">{dispute.order.status}</Badge>
                        </TableCell>
                        <TableCell className="py-5 align-top">
                          <span className="text-xs font-bold text-slate-600">
                            {format(new Date(dispute.createdAt), "HH:mm '•' dd MMM", { locale: fr })}
                          </span>
                        </TableCell>
                        <TableCell className="pr-8 py-5 text-right align-top">
                          {dispute.status === 'OPEN' ? (
                            <ResolveDialog dispute={dispute} />
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-black text-[9px] uppercase px-2 rounded">Résolu</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-24">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Aucun litige</h3>
                <p className="text-slate-500 mt-2 max-w-xs mx-auto font-medium">
                  {statusFilter === 'OPEN' ? "Aucun litige ouvert pour l'instant." : "Aucun litige résolu à afficher."}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}