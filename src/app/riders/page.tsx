'use client';

import * as React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useRiders, useCreateRider, useSetRiderPassword } from '@/hooks/use-riders';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Star, 
  MapPin, 
  Truck, 
  Phone, 
  Calendar, 
  MoreVertical,
  Loader2,
  Filter,
  UserPlus,
  AlertCircle,
  KeyRound
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { RIDER_STATUS_COLORS } from '@/constants';
import { Rider } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

export default function RidersPage() {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [resetPasswordRider, setResetPasswordRider] = React.useState<Rider | null>(null);
  
  const { data: riders, isLoading, error } = useRiders({ search, status: statusFilter });
  const createRiderMutation = useCreateRider();
  const setPasswordMutation = useSetRiderPassword();

  const handleAddRider = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const riderData = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      vehiclePlate: formData.get('vehiclePlate') as string,
    };
    const password = formData.get('password') as string;

    try {
      const rider = await createRiderMutation.mutateAsync(riderData);
      await setPasswordMutation.mutateAsync({ riderId: rider.id, password });
      toast.success(`Compte créé pour ${rider.name}. Identifiants : ${rider.phone} / ${password}`);
      setIsAddDialogOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Impossible de créer le livreur");
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resetPasswordRider) return;
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;

    try {
      await setPasswordMutation.mutateAsync({ riderId: resetPasswordRider.id, password });
      toast.success(`Mot de passe mis à jour pour ${resetPasswordRider.name}.`);
      setResetPasswordRider(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Impossible de mettre à jour le mot de passe");
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Disponible';
      case 'BUSY': return 'En livraison';
      case 'INACTIVE': return 'Hors ligne';
      default: return status;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Livreurs</h1>
            <p className="text-slate-500 mt-1 font-medium">Gérez votre flotte de livreurs et suivez leurs performances en temps réel.</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-fiatlux-primary hover:bg-[#0d4270] text-white font-bold h-11 px-6 shadow-lg shadow-blue-900/20 transition-all active:scale-95">
                <Plus className="w-5 h-5 mr-2" />
                Ajouter un livreur
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleAddRider}>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Nouveau Livreur</DialogTitle>
                  <DialogDescription className="text-slate-500">
                    Saisissez les informations du nouveau livreur pour l&apos;ajouter à la flotte FIATLUX.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5 py-6">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-xs font-black uppercase tracking-wider text-slate-400">Nom complet</Label>
                    <Input id="name" name="name" placeholder="Ex: Jean Dupont" className="h-11" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone" className="text-xs font-black uppercase tracking-wider text-slate-400">Téléphone</Label>
                    <Input id="phone" name="phone" placeholder="+242 06 000 00 00" className="h-11" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vehiclePlate" className="text-xs font-black uppercase tracking-wider text-slate-400">Plaque véhicule</Label>
                    <Input id="vehiclePlate" name="vehiclePlate" placeholder="123 AB 5" className="h-11" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-xs font-black uppercase tracking-wider text-slate-400">Mot de passe (compte chauffeur)</Label>
                    <Input id="password" name="password" type="text" placeholder="4 caractères minimum" className="h-11" minLength={4} required />
                    <p className="text-[11px] text-slate-400 font-medium">
                      Ce mot de passe (avec le numéro de téléphone) permettra au chauffeur de se connecter sur l&apos;app FiatLux Chauffeur.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                  <Button type="submit" disabled={createRiderMutation.isPending || setPasswordMutation.isPending} className="bg-fiatlux-primary text-white">
                    {createRiderMutation.isPending || setPasswordMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Création...
                      </>
                    ) : 'Enregistrer le livreur'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Reset password dialog */}
        <Dialog open={!!resetPasswordRider} onOpenChange={(open) => !open && setResetPasswordRider(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleResetPassword}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Réinitialiser le mot de passe</DialogTitle>
                <DialogDescription className="text-slate-500">
                  Définissez un nouveau mot de passe pour {resetPasswordRider?.name}. Communiquez-le lui directement.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-6">
                <Label htmlFor="reset-password" className="text-xs font-black uppercase tracking-wider text-slate-400">Nouveau mot de passe</Label>
                <Input id="reset-password" name="password" type="text" placeholder="4 caractères minimum" className="h-11" minLength={4} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setResetPasswordRider(null)}>Annuler</Button>
                <Button type="submit" disabled={setPasswordMutation.isPending} className="bg-fiatlux-primary text-white">
                  {setPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : 'Mettre à jour'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <Input 
              placeholder="Rechercher par nom, téléphone ou plaque..." 
              className="pl-11 h-11 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" className="h-11 px-5 border-slate-200 text-slate-600 font-bold">
                  <Filter className="w-4 h-4 mr-2 text-fiatlux-primary" />
                  Statut: {statusFilter === 'ALL' ? 'Tous' : getStatusLabel(statusFilter)}
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setStatusFilter('ALL')} className="text-xs font-bold uppercase tracking-wider py-2.5">Tous les statuts</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('ACTIVE')} className="text-xs font-bold uppercase tracking-wider py-2.5">Disponibles</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('BUSY')} className="text-xs font-bold uppercase tracking-wider py-2.5">En livraison</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('INACTIVE')} className="text-xs font-bold uppercase tracking-wider py-2.5">Hors ligne</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-72 bg-white border border-slate-100 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900">Erreur lors du chargement</h2>
            <p className="text-slate-500 mt-2">Impossible de récupérer la liste des livreurs.</p>
          </div>
        ) : riders?.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 border-dashed">
            <UserPlus className="w-14 h-14 text-slate-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-400">Aucun livreur trouvé</h2>
            <p className="text-slate-400 mt-2">Essayez de modifier vos filtres ou d&apos;ajouter un nouveau livreur.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {riders?.map((rider) => (
                <motion.div
                  key={rider.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="group border-slate-200 hover:border-fiatlux-primary hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 rounded-2xl overflow-hidden flex flex-col h-full">
                    <CardHeader className="relative pb-4 pt-6 px-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="relative">
                          <Avatar className="h-16 w-16 border-2 border-white shadow-md group-hover:scale-105 transition-transform">
                            <AvatarImage src={rider.avatar} />
                            <AvatarFallback className="bg-slate-50 text-slate-400 font-bold text-xl">
                              {rider.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className={cn(
                            "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ring-2 ring-transparent group-hover:ring-offset-2 transition-all",
                            rider.status === 'ACTIVE' ? "bg-emerald-500" : 
                            rider.status === 'BUSY' ? "bg-amber-500" : "bg-slate-300"
                          )}></span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-slate-600">
                                <MoreVertical className="w-4.5 h-4.5" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => setResetPasswordRider(rider)} className="text-xs font-bold py-2.5">
                              <KeyRound className="w-3.5 h-3.5 mr-2" />
                              Réinitialiser le mot de passe
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-fiatlux-primary transition-colors">{rider.name}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="secondary" className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider", RIDER_STATUS_COLORS[rider.status])}>
                            {getStatusLabel(rider.status)}
                          </Badge>
                          <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            {rider.vehiclePlate}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="px-6 pb-6 pt-2 space-y-5 flex-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Livraisons jour</p>
                          <div className="flex items-center gap-2">
                            <Truck className="w-3.5 h-3.5 text-fiatlux-primary" />
                            <span className="text-sm font-black text-slate-900">{rider.deliveriesToday}</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Note moy.</p>
                          <div className="flex items-center gap-2">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-black text-slate-900">{rider.rating?.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                          <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">
                            {rider.currentLocation?.address || 'Position inconnue'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-slate-300 shrink-0" />
                          <p className="text-xs text-slate-500 font-bold">{rider.phone}</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-50">
                        <Link 
                          href={`/riders/${rider.id}`}
                          className={cn(
                            buttonVariants({ variant: "ghost" }),
                            "w-full h-11 text-xs font-bold uppercase tracking-widest text-fiatlux-primary hover:bg-fiatlux-primary hover:text-white rounded-xl transition-all"
                          )}
                        >
                          Voir le profil détaillé
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}