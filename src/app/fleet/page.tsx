'use client';

import * as React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { 
  Bike, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Settings, 
  UserPlus, 
  Wrench, 
  Trash2, 
  Calendar, 
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowRight,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useFleet, useUpdateVehicle, useDeleteVehicle } from '@/hooks/use-fleet';
import { ConfirmationModal } from '@/components/shared/confirmation-modal';
import Link from 'next/link';
import Image from 'next/image';

export default function FleetPage() {
  const { data: vehicles, isLoading } = useFleet();
  const updateVehicleMutation = useUpdateVehicle();
  const deleteVehicleMutation = useDeleteVehicle();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'IN_SERVICE' | 'MAINTENANCE' | 'OUT_OF_SERVICE'>('ALL');
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [selectedVehicle, setSelectedVehicle] = React.useState<any>(null);

  const [editFormData, setEditFormData] = React.useState<{
    plate: string;
    model: string;
    status: 'IN_SERVICE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
    mileage: number;
    nextServiceDate: string;
  }>({
    plate: '',
    model: '',
    status: 'IN_SERVICE',
    mileage: 0,
    nextServiceDate: ''
  });

  const filteredVehicles = React.useMemo(() => {
    if (!vehicles) return [];
    return vehicles.filter(v => {
      const matchesSearch = v.plate.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (v.assignedRiderName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchQuery, statusFilter]);

  const handleEditClick = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setEditFormData({
      plate: vehicle.plate,
      model: vehicle.model,
      status: vehicle.status,
      mileage: vehicle.mileage,
      nextServiceDate: vehicle.nextServiceDate
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateVehicleMutation.mutate({
      id: selectedVehicle.id,
      updates: editFormData
    }, {
      onSuccess: () => setIsEditModalOpen(false)
    });
  };

  const handleDelete = () => {
    deleteVehicleMutation.mutate(selectedVehicle.id, {
      onSuccess: () => setIsDeleteModalOpen(false)
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_SERVICE':
        return (
          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded">
            En service
          </Badge>
        );
      case 'MAINTENANCE':
        return (
          <Badge className="bg-amber-50 text-amber-600 border-amber-100 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded">
            En maintenance
          </Badge>
        );
      case 'OUT_OF_SERVICE':
        return (
          <Badge className="bg-red-50 text-red-600 border-red-100 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded">
            Hors service
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IN_SERVICE':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'MAINTENANCE':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'OUT_OF_SERVICE':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Flotte</h1>
            <p className="text-slate-500 font-medium mt-1">Gérez votre parc de véhicules et leur maintenance.</p>
          </div>
          <div className="flex gap-3">
            <Button className="h-11 px-6 rounded-xl bg-fiatlux-primary hover:bg-fiatlux-primary/90 font-black gap-2">
              <Plus className="w-4 h-4" />
              Ajouter une moto
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-slate-200 shadow-sm rounded-3xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Bike className="w-6 h-6 text-fiatlux-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Véhicules</p>
                <p className="text-2xl font-black text-slate-900">{vehicles?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm rounded-3xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">En Service</p>
                <p className="text-2xl font-black text-slate-900">
                  {vehicles?.filter(v => v.status === 'IN_SERVICE').length || 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm rounded-3xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">En Maintenance</p>
                <p className="text-2xl font-black text-slate-900">
                  {vehicles?.filter(v => v.status === 'MAINTENANCE').length || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fleet Table */}
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Plaque, modèle, livreur..." 
                    className="h-12 pl-12 rounded-xl border-slate-200 focus:ring-fiatlux-primary/20 font-medium"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100">
                  <button 
                    onClick={() => setStatusFilter('ALL')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                      statusFilter === 'ALL' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Tous
                  </button>
                  <button 
                    onClick={() => setStatusFilter('IN_SERVICE')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                      statusFilter === 'IN_SERVICE' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Service
                  </button>
                  <button 
                    onClick={() => setStatusFilter('MAINTENANCE')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                      statusFilter === 'MAINTENANCE' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Maintenance
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-fiatlux-primary animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Chargement de la flotte...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-50">
                    <TableHead className="pl-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Véhicule</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Livreur Assigné</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Statut</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Kilométrage</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Révision</TableHead>
                    <TableHead className="pr-8 py-5 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((v) => (
                    <TableRow key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                            <Bike className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <span className="text-sm font-black text-slate-900 block">{v.plate}</span>
                            <span className="text-xs font-medium text-slate-400">{v.model}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        {v.assignedRiderId ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden relative">
                              <Image 
                                src={`https://i.pravatar.cc/150?u=${v.assignedRiderId}`} 
                                alt="" 
                                fill 
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <span className="text-sm font-bold text-slate-700">{v.assignedRiderName}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-300 italic uppercase tracking-wider">Non assigné</span>
                        )}
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(v.status)}
                          {getStatusBadge(v.status)}
                        </div>
                      </TableCell>
                      <TableCell className="py-5 text-right">
                        <span className="text-sm font-black text-slate-900">{v.mileage.toLocaleString()} km</span>
                      </TableCell>
                      <TableCell className="py-5 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-slate-700">{v.nextServiceDate}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase">Prochaine</span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-8 py-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="rounded-xl border-slate-200">
                            <DropdownMenuItem 
                              onClick={() => handleEditClick(v)}
                              className="gap-2 font-bold text-xs p-3 cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                              Modifier les infos
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 font-bold text-xs p-3 cursor-pointer">
                              <UserPlus className="w-4 h-4" />
                              Assigner à un livreur
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => { setSelectedVehicle(v); setIsDeleteModalOpen(true); }}
                              className="gap-2 font-bold text-xs p-3 text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              Retirer du service
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!isLoading && filteredVehicles.length === 0 && (
              <div className="text-center py-24">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                  <Bike className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Aucun véhicule trouvé</h3>
                <p className="text-slate-500 mt-2 max-w-xs mx-auto">
                  Essayez d&apos;ajuster vos critères de recherche ou de filtre.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Modifier véhicule</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Mettez à jour les données techniques de la moto {selectedVehicle?.plate}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Plaque</Label>
                  <Input 
                    value={editFormData.plate}
                    onChange={e => setEditFormData({...editFormData, plate: e.target.value})}
                    className="h-12 rounded-xl border-slate-200 uppercase font-mono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Modèle</Label>
                  <Input 
                    value={editFormData.model}
                    onChange={e => setEditFormData({...editFormData, model: e.target.value})}
                    className="h-12 rounded-xl border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Kilométrage (km)</Label>
                  <Input 
                    type="number"
                    value={editFormData.mileage}
                    onChange={e => setEditFormData({...editFormData, mileage: parseInt(e.target.value)})}
                    className="h-12 rounded-xl border-slate-200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Statut</Label>
                  <select 
                    value={editFormData.status}
                    onChange={e => setEditFormData({...editFormData, status: e.target.value as 'IN_SERVICE' | 'MAINTENANCE' | 'OUT_OF_SERVICE'})}
                    className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none"
                  >
                    <option value="IN_SERVICE">En service</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="OUT_OF_SERVICE">Hors service</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                className="w-full bg-fiatlux-primary text-white font-black uppercase h-12 rounded-xl"
                disabled={updateVehicleMutation.isPending}
              >
                {updateVehicleMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Mettre à jour"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Retirer du service ?"
        description="Si la moto est assignée à un livreur, elle sera désassignée automatiquement avant d'être retirée."
        isLoading={deleteVehicleMutation.isPending}
      />
    </DashboardLayout>
  );
}