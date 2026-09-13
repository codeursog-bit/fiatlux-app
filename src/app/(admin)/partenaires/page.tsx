'use client';

import * as React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreVertical,
  User,
  Phone,
  Mail,
  Calendar,
  Package,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Lock,
  Eye,
  Pencil,
  Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePartners, useCreatePartner, useUpdatePartnerStatus, useDeletePartner } from '@/hooks/use-partners';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function PartenairesPage() {
  const router = useRouter();
  const { data: partners, isLoading } = usePartners();
  const createPartner = useCreatePartner();
  const updateStatus = useUpdatePartnerStatus();
  const deletePartner = useDeletePartner();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [partnerToDelete, setPartnerToDelete] = React.useState<{ id: string; companyName: string } | null>(null);
  const [newPartner, setNewPartner] = React.useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    password: ''
  });

  const filteredPartners = partners?.filter(p => 
    p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPartner.mutateAsync(newPartner);
      setIsAddDialogOpen(false);
      setNewPartner({ companyName: '', contactPerson: '', email: '', phone: '', password: '' });
      toast.success('Partenaire ajouté avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du partenaire');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await updateStatus.mutateAsync({ id, status: newStatus as any });
      toast.success(newStatus === 'ACTIVE' ? 'Compte réactivé' : 'Compte suspendu');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const generateTempPassword = () => {
    const pwd = Math.random().toString(36).slice(-8);
    setNewPartner(prev => ({ ...prev, password: pwd }));
  };

  const handleDeletePartner = async () => {
    if (!partnerToDelete) return;
    try {
      await deletePartner.mutateAsync(partnerToDelete.id);
      toast.success('Partenaire supprimé');
      setPartnerToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression du partenaire');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 bg-white -mx-4 md:-mx-6 px-4 md:px-6 py-2 md:py-3 -mt-4 md:-mt-6 mb-2 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight uppercase tracking-widest">Gestion des Partenaires</h1>
            <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 font-medium">Administrez les entreprises partenaires et leurs accès.</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger>
              <Button className="h-9 rounded-md bg-fiatlux-primary hover:bg-fiatlux-primary/90 text-white text-xs font-bold gap-2 shadow-sm transition-all uppercase tracking-wider">
                <Plus className="w-4 h-4" /> Ajouter un partenaire
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-[30px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-black italic tracking-tight">Nouveau Partenaire</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddPartner} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom de l'entreprise</Label>
                  <Input 
                    id="companyName" 
                    required
                    value={newPartner.companyName}
                    onChange={e => setNewPartner(prev => ({ ...prev, companyName: e.target.value }))}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200" 
                    placeholder="Ex: Boulangerie Moderne"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Personne de contact</Label>
                  <Input 
                    id="contactPerson" 
                    required
                    value={newPartner.contactPerson}
                    onChange={e => setNewPartner(prev => ({ ...prev, contactPerson: e.target.value }))}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200" 
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email (Connexion)</Label>
                    <Input 
                      id="email" 
                      type="email"
                      required
                      value={newPartner.email}
                      onChange={e => setNewPartner(prev => ({ ...prev, email: e.target.value }))}
                      className="h-12 rounded-xl bg-slate-50 border-slate-200" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Téléphone</Label>
                    <Input 
                      id="phone" 
                      required
                      value={newPartner.phone}
                      onChange={e => setNewPartner(prev => ({ ...prev, phone: e.target.value }))}
                      className="h-12 rounded-xl bg-slate-50 border-slate-200" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mot de passe temporaire</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="password" 
                      required
                      value={newPartner.password}
                      onChange={e => setNewPartner(prev => ({ ...prev, password: e.target.value }))}
                      className="h-12 rounded-xl bg-slate-50 border-slate-200 font-mono" 
                    />
                    <Button type="button" variant="outline" onClick={generateTempPassword} className="h-12 rounded-xl px-3 border-slate-200">
                      <Lock className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createPartner.isPending} className="w-full h-12 rounded-2xl bg-fiatlux-primary text-white font-bold">
                    {createPartner.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer le partenaire'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Rechercher une entreprise, un contact, un email..." 
              className="pl-10 h-11 rounded-xl bg-white border-slate-200"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 p-2 rounded-lg">
                <Building2 className="w-4 h-4 text-fiatlux-primary" />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total</span>
            </div>
            <span className="text-lg font-black text-slate-900 italic">{partners?.length ?? 0}</span>
          </div>
        </div>

        {/* Partners Table */}
        <div className="bg-white border border-slate-200 rounded-[30px] overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Entreprise</TableHead>
                <TableHead className="py-4 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contact</TableHead>
                <TableHead className="py-4 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Téléphone</TableHead>
                <TableHead className="py-4 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Commandes</TableHead>
                <TableHead className="py-4 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Statut</TableHead>
                <TableHead className="py-4 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Création</TableHead>
                <TableHead className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-fiatlux-primary mx-auto" />
                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Chargement des partenaires...</p>
                  </TableCell>
                </TableRow>
              ) : filteredPartners?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-400">Aucun partenaire trouvé</p>
                  </TableCell>
                </TableRow>
              ) : filteredPartners?.map((partner) => (
                <TableRow key={partner.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm">
                        {partner.companyName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{partner.companyName}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5" /> {partner.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-3">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-xs font-medium text-slate-600">{partner.contactName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-3">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-xs font-medium text-slate-600">{partner.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-3 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-sm font-black text-slate-900">{partner.totalOrders}</span>
                      <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Missions</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-3">
                    <Badge className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                      partner.status === 'ACTIVE' 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : "bg-red-50 text-red-700 border-red-100"
                    )}>
                      {partner.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-5 px-3">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-medium">{format(new Date(partner.createdAt), 'dd MMM yyyy', { locale: fr })}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="rounded-2xl">
                        <DropdownMenuItem
                          onClick={() => router.push(`/partenaires/${partner.id}`)}
                          className="text-xs font-bold gap-2"
                        >
                          <Eye className="w-4 h-4" /> Voir le profil
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/partenaires/${partner.id}?edit=1`)}
                          className="text-xs font-bold gap-2"
                        >
                          <Pencil className="w-4 h-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleToggleStatus(partner.id, partner.status)}
                          className={cn(
                            "text-xs font-bold gap-2",
                            partner.status === 'ACTIVE' ? "text-red-600" : "text-emerald-600"
                          )}
                        >
                          {partner.status === 'ACTIVE' ? (
                            <><ShieldAlert className="w-4 h-4" /> Suspendre l'accès</>
                          ) : (
                            <><ShieldCheck className="w-4 h-4" /> Réactiver l'accès</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setPartnerToDelete({ id: partner.id, companyName: partner.companyName })}
                          className="text-xs font-bold gap-2 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!partnerToDelete} onOpenChange={(open) => !open && setPartnerToDelete(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-[30px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic tracking-tight text-red-600">Supprimer le partenaire ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 font-medium">
            Cette action est irréversible pour <strong>{partnerToDelete?.companyName}</strong>. Si ce partenaire a déjà des commandes enregistrées, la suppression sera refusée pour préserver l'historique — utilisez plutôt "Suspendre l'accès" dans ce cas.
          </p>
          <DialogFooter className="pt-4 gap-2">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => setPartnerToDelete(null)}
            >
              Annuler
            </Button>
            <Button
              disabled={deletePartner.isPending}
              onClick={handleDeletePartner}
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