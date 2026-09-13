'use client';

import * as React from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  Building2,
  ChevronLeft,
  Mail,
  Phone,
  User,
  Calendar,
  Package,
  CheckCircle2,
  XCircle,
  Loader2,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Save,
  X,
  Bike,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { usePartner, useUpdatePartner, useUpdatePartnerStatus, useDeletePartner } from '@/hooks/use-partners';
import { STATUS_COLORS, ORDER_STATUS_LABELS } from '@/constants';
import { OrderStatus } from '@/types';

export default function PartnerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;

  const { data, isLoading, error } = usePartner(id);
  const updatePartner = useUpdatePartner();
  const updateStatus = useUpdatePartnerStatus();
  const deletePartner = useDeletePartner();

  const [isEditing, setIsEditing] = React.useState(searchParams.get('edit') === '1');
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    password: '',
  });

  React.useEffect(() => {
    if (data?.partner) {
      setForm({
        companyName: data.partner.companyName,
        contactName: data.partner.contactName,
        email: data.partner.email,
        phone: data.partner.phone,
        password: '',
      });
    }
  }, [data?.partner]);

  const handleSave = async () => {
    try {
      const updates: Record<string, string> = {
        companyName: form.companyName,
        contactName: form.contactName,
        email: form.email,
        phone: form.phone,
      };
      if (form.password) {
        updates.password = form.password;
      }
      await updatePartner.mutateAsync({ id, updates });
      toast.success('Partenaire mis à jour');
      setIsEditing(false);
      setForm(prev => ({ ...prev, password: '' }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleToggleStatus = async () => {
    if (!data?.partner) return;
    const newStatus = data.partner.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await updateStatus.mutateAsync({ id, status: newStatus as any });
      toast.success(newStatus === 'ACTIVE' ? 'Compte réactivé' : 'Compte suspendu');
    } catch {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePartner.mutateAsync(id);
      toast.success('Partenaire supprimé');
      router.push('/partenaires');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erreur lors de la suppression');
      setIsDeleteOpen(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-96 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-fiatlux-primary" />
          <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Chargement du partenaire...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="h-96 flex flex-col items-center justify-center text-center">
          <Building2 className="w-12 h-12 text-slate-200 mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Partenaire introuvable</h2>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={() => router.push('/partenaires')}>
            Retour à la liste
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { partner, stats, orders } = data;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/partenaires')}
              className="h-9 w-9 rounded-full border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg">
                {partner.companyName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">{partner.companyName}</h1>
                  <Badge className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                    partner.status === 'ACTIVE'
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-red-50 text-red-700 border-red-100"
                  )}>
                    {partner.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Partenaire depuis le {format(new Date(partner.createdAt), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <Button variant="outline" className="rounded-xl gap-2 text-xs font-bold" onClick={() => setIsEditing(true)}>
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "rounded-xl gap-2 text-xs font-bold",
                    partner.status === 'ACTIVE' ? "text-red-600 border-red-100 hover:bg-red-50" : "text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                  )}
                  onClick={handleToggleStatus}
                  disabled={updateStatus.isPending}
                >
                  {partner.status === 'ACTIVE' ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  {partner.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl gap-2 text-xs font-bold text-red-600 border-red-100 hover:bg-red-50"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="rounded-xl gap-2 text-xs font-bold" onClick={() => setIsEditing(false)}>
                  <X className="w-3.5 h-3.5" /> Annuler
                </Button>
                <Button
                  className="rounded-xl gap-2 text-xs font-bold bg-fiatlux-primary text-white"
                  onClick={handleSave}
                  disabled={updatePartner.isPending}
                >
                  {updatePartner.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Enregistrer
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Info card / edit form */}
        <div className="bg-white border border-slate-200 rounded-[30px] p-6 shadow-sm">
          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow icon={<User className="w-4 h-4" />} label="Personne de contact" value={partner.contactName} />
              <InfoRow icon={<Mail className="w-4 h-4" />} label="Email (connexion)" value={partner.email} />
              <InfoRow icon={<Phone className="w-4 h-4" />} label="Téléphone" value={partner.phone} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom de l'entreprise</Label>
                  <Input
                    value={form.companyName}
                    onChange={e => setForm(prev => ({ ...prev, companyName: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Personne de contact</Label>
                  <Input
                    value={form.contactName}
                    onChange={e => setForm(prev => ({ ...prev, contactName: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email (connexion)</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Téléphone</Label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
              </div>
              <div className="space-y-2 md:w-1/2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Nouveau mot de passe (optionnel)
                </Label>
                <Input
                  type="text"
                  placeholder="Laisser vide pour ne pas changer"
                  value={form.password}
                  onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={<Package className="w-4 h-4" />} label="Total commandes" value={stats.totalOrders} />
          <StatCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Livrées" value={stats.deliveredCount} />
          <StatCard icon={<Bike className="w-4 h-4 text-amber-500" />} label="En cours" value={stats.activeCount} />
          <StatCard icon={<XCircle className="w-4 h-4 text-red-500" />} label="Annulées / échouées" value={stats.cancelledCount} />
          <StatCard
            icon={<Package className="w-4 h-4" />}
            label="CA livré (FCFA)"
            value={stats.totalRevenue.toLocaleString('fr-FR')}
          />
        </div>

        {/* Orders history */}
        <div className="bg-white border border-slate-200 rounded-[30px] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Historique des commandes</h2>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {stats.lastOrderAt
                ? `Dernière commande le ${format(new Date(stats.lastOrderAt), 'dd MMM yyyy à HH:mm', { locale: fr })}`
                : "Aucune commande pour l'instant"}
            </p>
          </div>
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="py-3 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Commande</TableHead>
                <TableHead className="py-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Trajet</TableHead>
                <TableHead className="py-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Destinataire</TableHead>
                <TableHead className="py-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Chauffeur</TableHead>
                <TableHead className="py-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Montant</TableHead>
                <TableHead className="py-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Statut</TableHead>
                <TableHead className="py-3 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-400">Aucune commande enregistrée pour ce partenaire</p>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <TableCell className="py-4 px-6">
                      <p className="text-xs font-bold text-slate-900">#{order.trackingNumber}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{order.packageDescription}</p>
                    </TableCell>
                    <TableCell className="py-4 px-3 max-w-[220px]">
                      <p className="text-[11px] text-slate-600 font-medium truncate">{order.pickupAddress}</p>
                      <p className="text-[11px] text-slate-400 truncate">→ {order.dropoffAddress}</p>
                    </TableCell>
                    <TableCell className="py-4 px-3">
                      <p className="text-xs font-medium text-slate-600">{order.recipientName}</p>
                      <p className="text-[10px] text-slate-400">{order.recipientPhone}</p>
                    </TableCell>
                    <TableCell className="py-4 px-3">
                      {order.rider ? (
                        <p className="text-xs font-medium text-slate-600">{order.rider.name}</p>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-bold uppercase">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-3 text-right">
                      <span className="text-xs font-black text-slate-900">{order.amount.toLocaleString('fr-FR')}</span>
                    </TableCell>
                    <TableCell className="py-4 px-3">
                      <Badge className={cn("text-[9px] px-2 py-0.5 rounded uppercase font-bold", STATUS_COLORS[order.status as OrderStatus])}>
                        {ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px] font-medium">{format(new Date(order.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[30px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic tracking-tight text-red-600">Supprimer le partenaire ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 font-medium">
            Cette action est irréversible pour <strong>{partner.companyName}</strong>. Si ce partenaire a déjà des commandes enregistrées ({stats.totalOrders}), la suppression sera refusée pour préserver l'historique — utilisez "Suspendre" à la place.
          </p>
          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={() => setIsDeleteOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={deletePartner.isPending}
              onClick={handleDelete}
              className="rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {deletePartner.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-sm font-bold text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-slate-50 p-1.5 rounded-lg">{icon}</div>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <span className="text-xl font-black text-slate-900 italic">{value}</span>
    </div>
  );
}