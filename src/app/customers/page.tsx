'use client';

import * as React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/use-customers';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Building2, 
  User, 
  Phone, 
  MoreVertical, 
  Eye, 
  CreditCard, 
  Calendar,
  Mail,
  MapPin,
  Loader2,
  ChevronRight,
  TrendingUp,
  Briefcase,
  Edit,
  Trash2,
  UserX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ConfirmationModal } from '@/components/shared/confirmation-modal';
import Link from 'next/link';

export default function CustomersPage() {
  const router = useRouter();
  const { data: customers = [], isLoading } = useCustomers();
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'ALL' | 'BUSINESS' | 'INDIVIDUAL'>('ALL');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    contactPerson: '',
    billingMethod: 'PER_ORDER' as 'MONTHLY' | 'PER_ORDER'
  });

  const [editFormData, setEditFormData] = React.useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    contactPerson: '',
    billingMethod: 'PER_ORDER' as 'MONTHLY' | 'PER_ORDER'
  });

  const filteredCustomers = React.useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           c.phone.includes(searchQuery);
      const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [customers, searchQuery, typeFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomerMutation.mutate({
      ...formData,
      type: 'BUSINESS',
      businessDetails: {
        contactPerson: formData.contactPerson,
        billingMethod: formData.billingMethod
      }
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormData({
          name: '',
          phone: '',
          email: '',
          address: '',
          contactPerson: '',
          billingMethod: 'PER_ORDER'
        });
      }
    });
  };

  const handleEditClick = (customer: any) => {
    setSelectedCustomer(customer);
    setEditFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      contactPerson: customer.businessDetails?.contactPerson || '',
      billingMethod: customer.businessDetails?.billingMethod || 'PER_ORDER'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCustomerMutation.mutate({
      id: selectedCustomer.id,
      updates: {
        ...editFormData,
        businessDetails: selectedCustomer.type === 'BUSINESS' ? {
          contactPerson: editFormData.contactPerson,
          billingMethod: editFormData.billingMethod
        } : undefined
      }
    }, {
      onSuccess: () => setIsEditModalOpen(false)
    });
  };

  const handleDelete = () => {
    deleteCustomerMutation.mutate(selectedCustomer.id, {
      onSuccess: () => setIsDeleteModalOpen(false)
    });
  };

  const stats = React.useMemo(() => {
    return {
      total: customers.length,
      business: customers.filter(c => c.type === 'BUSINESS').length,
      individual: customers.filter(c => c.type === 'INDIVIDUAL').length,
      totalRevenue: customers.reduce((acc, c) => acc + c.totalSpent, 0)
    };
  }, [customers]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Clients</h1>
            <p className="text-slate-500 font-medium mt-1">Gérez votre base de clients B2B et particuliers.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-fiatlux-primary text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-900/20 gap-2">
                <Plus className="w-5 h-5" />
                Ajouter un client entreprise
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl p-8 border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">Nouveau client Business</DialogTitle>
                <DialogDescription className="text-slate-500 font-medium pt-1">
                  Enregistrez une nouvelle entreprise pour bénéficier de la facturation mensuelle.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-xs font-black uppercase text-slate-400 tracking-widest">Nom de l&apos;entreprise</Label>
                    <Input 
                      id="name" 
                      placeholder="ex: Boutique Canal" 
                      className="h-12 rounded-xl border-slate-200 focus:ring-fiatlux-primary/20"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="contact" className="text-xs font-black uppercase text-slate-400 tracking-widest">Contact principal</Label>
                      <Input 
                        id="contact" 
                        placeholder="Prénom Nom" 
                        className="h-12 rounded-xl border-slate-200"
                        value={formData.contactPerson}
                        onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone" className="text-xs font-black uppercase text-slate-400 tracking-widest">Téléphone</Label>
                      <Input 
                        id="phone" 
                        placeholder="+242..." 
                        className="h-12 rounded-xl border-slate-200"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address" className="text-xs font-black uppercase text-slate-400 tracking-widest">Adresse</Label>
                    <Input 
                      id="address" 
                      placeholder="Quartier, Ville" 
                      className="h-12 rounded-xl border-slate-200"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Mode de facturation</Label>
                    <div className="flex gap-4 p-1 bg-slate-50 rounded-xl border border-slate-100">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, billingMethod: 'PER_ORDER'})}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                          formData.billingMethod === 'PER_ORDER' ? "bg-white text-fiatlux-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        À la commande
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, billingMethod: 'MONTHLY'})}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                          formData.billingMethod === 'MONTHLY' ? "bg-white text-fiatlux-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Mensuelle
                      </button>
                    </div>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-fiatlux-primary text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-900/20"
                    disabled={createCustomerMutation.isPending}
                  >
                    {createCustomerMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Créer le compte entreprise"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Users className="w-6 h-6 text-fiatlux-primary" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Clients</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{stats.total}</span>
                  <span className="text-xs font-bold text-slate-500">comptes</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Entreprises B2B</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{stats.business}</span>
                  <span className="text-xs font-bold text-slate-500">partenaires</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <User className="w-6 h-6 text-amber-500" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Particuliers</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{stats.individual}</span>
                  <span className="text-xs font-bold text-slate-500">utilisateurs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Volume d&apos;affaires</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(stats.totalRevenue)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Nom, téléphone..." 
                    className="h-12 pl-12 rounded-xl border-slate-200 focus:ring-fiatlux-primary/20 font-medium"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100">
                  <button 
                    onClick={() => setTypeFilter('ALL')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                      typeFilter === 'ALL' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Tous
                  </button>
                  <button 
                    onClick={() => setTypeFilter('BUSINESS')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                      typeFilter === 'BUSINESS' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Entreprise
                  </button>
                  <button 
                    onClick={() => setTypeFilter('INDIVIDUAL')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                      typeFilter === 'INDIVIDUAL' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Particulier
                  </button>
                </div>
              </div>
              <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-200 font-bold text-slate-600 gap-2">
                <Filter className="w-4 h-4" />
                Filtres avancés
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-fiatlux-primary animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Chargement des clients...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-50">
                    <TableHead className="pl-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Client</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Type</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Contact & Tel</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Commandes</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total dépensé</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Dernière commande</TableHead>
                    <TableHead className="pr-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                            customer.type === 'BUSINESS' ? "bg-blue-50 border-blue-100" : "bg-amber-50 border-amber-100"
                          )}>
                            {customer.type === 'BUSINESS' ? (
                              <Building2 className="w-5 h-5 text-fiatlux-primary" />
                            ) : (
                              <User className="w-5 h-5 text-amber-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 group-hover:text-fiatlux-primary transition-colors">{customer.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{customer.email || 'Pas d\'email'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <Badge variant="secondary" className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest border",
                          customer.type === 'BUSINESS' 
                            ? "bg-blue-50 text-fiatlux-primary border-blue-100" 
                            : "bg-slate-50 text-slate-500 border-slate-100"
                        )}>
                          {customer.type === 'BUSINESS' ? 'Entreprise' : 'Particulier'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700">{customer.businessDetails?.contactPerson || customer.name}</span>
                          <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 text-center">
                        <span className="text-sm font-black text-slate-900">{customer.totalOrders}</span>
                      </TableCell>
                      <TableCell className="py-5 text-right">
                        <span className="text-sm font-black text-slate-900">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(customer.totalSpent)}
                        </span>
                      </TableCell>
                      <TableCell className="py-5 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-700">
                            {customer.lastOrderDate ? format(new Date(customer.lastOrderDate), 'dd/MM/yyyy') : '-'}
                          </span>
                          {customer.lastOrderDate && (
                            <span className="text-[9px] font-medium text-slate-400">
                              {format(new Date(customer.lastOrderDate), 'HH:mm')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="pr-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            onClick={() => router.push(`/customers/${customer.id}`)}
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-lg hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4 text-slate-400" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-9 w-9 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center">
                              <MoreVertical className="w-4 h-4 text-slate-400" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-slate-200">
                              <DropdownMenuItem 
                                onClick={() => handleEditClick(customer)}
                                className="gap-2 font-bold text-xs p-3 cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => { setSelectedCustomer(customer); setIsDeleteModalOpen(true); }}
                                className="gap-2 font-bold text-xs p-3 text-red-600 cursor-pointer"
                              >
                                <UserX className="w-4 h-4" />
                                Désactiver/Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!isLoading && filteredCustomers.length === 0 && (
              <div className="text-center py-24">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                  <Users className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Aucun client trouvé</h3>
                <p className="text-slate-500 mt-2 max-w-xs mx-auto">
                  Ajustez vos filtres ou effectuez une nouvelle recherche pour trouver un client.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">Modifier le client</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium pt-1">
              Mettez à jour les informations de {selectedCustomer?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Nom / Raison sociale</Label>
                <Input 
                  value={editFormData.name}
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                  className="h-12 rounded-xl border-slate-200"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Téléphone</Label>
                  <Input 
                    value={editFormData.phone}
                    onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                    className="h-12 rounded-xl border-slate-200"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Email</Label>
                  <Input 
                    type="email"
                    value={editFormData.email}
                    onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                    className="h-12 rounded-xl border-slate-200"
                  />
                </div>
              </div>
              
              {selectedCustomer?.type === 'BUSINESS' && (
                <>
                  <div className="grid gap-2">
                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Contact principal</Label>
                    <Input 
                      value={editFormData.contactPerson}
                      onChange={e => setEditFormData({...editFormData, contactPerson: e.target.value})}
                      className="h-12 rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Mode de facturation</Label>
                    <div className="flex gap-4 p-1 bg-slate-50 rounded-xl border border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditFormData({...editFormData, billingMethod: 'PER_ORDER'})}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                          editFormData.billingMethod === 'PER_ORDER' ? "bg-white text-fiatlux-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        À la commande
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditFormData({...editFormData, billingMethod: 'MONTHLY'})}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                          editFormData.billingMethod === 'MONTHLY' ? "bg-white text-fiatlux-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Mensuelle
                      </button>
                    </div>
                  </div>
                </>
              )}
              
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Adresse</Label>
                <Input 
                  value={editFormData.address}
                  onChange={e => setEditFormData({...editFormData, address: e.target.value})}
                  className="h-12 rounded-xl border-slate-200"
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-fiatlux-primary text-white font-bold h-12 rounded-xl"
                disabled={updateCustomerMutation.isPending}
              >
                {updateCustomerMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enregistrer les modifications"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Désactiver ce client ?"
        description="Si le client a un historique de commandes, il sera marqué comme inactif. Sinon, il sera supprimé de la base de données."
        isLoading={deleteCustomerMutation.isPending}
      />
    </DashboardLayout>
  );
}
