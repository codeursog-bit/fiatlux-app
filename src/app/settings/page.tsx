'use client';

import * as React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { 
  Settings, 
  Map as MapIcon, 
  Plus, 
  Trash2, 
  Edit, 
  ChevronRight, 
  Loader2, 
  Globe, 
  Zap, 
  Clock,
  Euro,
  Tag,
  AlertTriangle,
  Info
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { usePricingZones, useCreatePricingZone, useUpdatePricingZone, useDeletePricingZone, usePricingRules, useCreatePricingRule, useUpdatePricingRule, useDeletePricingRule } from '@/hooks/use-pricing';
import { useLandmarks, useCreateLandmark, useUpdateLandmark, useDeleteLandmark } from '@/hooks/use-landmarks';
import { useMotekiProducts, useCreateMotekiProduct, useUpdateMotekiProduct, useDeleteMotekiProduct } from '@/hooks/use-moteki-products';
import { ConfirmationModal } from '@/components/shared/confirmation-modal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { data: zones, isLoading: isLoadingZones } = usePricingZones();
  const { data: rules, isLoading: isLoadingRules } = usePricingRules();
  
  const createZoneMutation = useCreatePricingZone();
  const updateZoneMutation = useUpdatePricingZone();
  const deleteZoneMutation = useDeletePricingZone();
  
  const createRuleMutation = useCreatePricingRule();
  const updateRuleMutation = useUpdatePricingRule();
  const deleteRuleMutation = useDeletePricingRule();

  const [isZoneModalOpen, setIsZoneModalOpen] = React.useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  
  const [selectedItem, setSelectedItem] = React.useState<any>(null);
  const [deleteType, setDeleteType] = React.useState<'ZONE' | 'RULE'>('ZONE');

  const [zoneFormData, setZoneFormData] = React.useState({ name: '' });
  const [ruleFormData, setRuleFormData] = React.useState({
    zoneId: '',
    minDistance: 0,
    maxDistance: 0,
    basePrice: 0,
    pricePerKm: 0
  });

  const handleCreateZone = (e: React.FormEvent) => {
    e.preventDefault();
    createZoneMutation.mutate(zoneFormData.name, {
      onSuccess: () => {
        setIsZoneModalOpen(false);
        setZoneFormData({ name: '' });
        toast.success('Zone créée avec succès');
      }
    });
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    createRuleMutation.mutate(ruleFormData, {
      onSuccess: () => {
        setIsRuleModalOpen(false);
        setRuleFormData({
          zoneId: '',
          minDistance: 0,
          maxDistance: 0,
          basePrice: 0,
          pricePerKm: 0
        });
        toast.success('Règle tarifaire ajoutée');
      }
    });
  };

  const handleDelete = () => {
    if (deleteType === 'ZONE') {
      deleteZoneMutation.mutate(selectedItem.id, {
        onSuccess: () => setIsDeleteModalOpen(false)
      });
    } else {
      deleteRuleMutation.mutate(selectedItem.id, {
        onSuccess: () => setIsDeleteModalOpen(false)
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Paramètres</h1>
          <p className="text-slate-500 font-medium mt-1">Configurez les zones et les tarifs de livraison.</p>
        </div>

        <Tabs defaultValue="pricing" className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-2xl h-14 w-full md:w-auto">
            <TabsTrigger value="pricing" className="px-8 rounded-xl h-full font-bold data-[active]:bg-white data-[active]:text-fiatlux-primary data-[active]:shadow-sm">
              Tarification
            </TabsTrigger>
            <TabsTrigger value="landmarks" className="px-8 rounded-xl h-full font-bold data-[active]:bg-white data-[active]:text-fiatlux-primary data-[active]:shadow-sm">
              Repères
            </TabsTrigger>
            <TabsTrigger value="moteki" className="px-8 rounded-xl h-full font-bold data-[active]:bg-white data-[active]:text-fiatlux-primary data-[active]:shadow-sm">
              Paiement en ligne
            </TabsTrigger>
            <TabsTrigger value="general" className="px-8 rounded-xl h-full font-bold data-[active]:bg-white data-[active]:text-fiatlux-primary data-[active]:shadow-sm">
              Général
            </TabsTrigger>
          </TabsList>

          <TabsContent value="landmarks" className="space-y-6 mt-8 outline-none">
            <LandmarksTab />
          </TabsContent>

          <TabsContent value="moteki" className="space-y-6 mt-8 outline-none">
            <MotekiTab />
          </TabsContent>

          <TabsContent value="pricing" className="space-y-8 mt-8 outline-none">
            {/* Zones Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                  <CardHeader className="pb-4 pt-8 px-8">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-black italic tracking-tight uppercase">Zones</CardTitle>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setIsZoneModalOpen(true)}
                        className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100"
                      >
                        <Plus className="w-5 h-5 text-fiatlux-primary" />
                      </Button>
                    </div>
                    <CardDescription className="text-xs font-medium">Définissez vos zones géographiques.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pb-6">
                    <div className="space-y-2">
                      {isLoadingZones ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-fiatlux-primary" />
                        </div>
                      ) : zones?.map((zone: any) => (
                        <div 
                          key={zone.id} 
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all group cursor-pointer",
                            selectedItem?.id === zone.id && deleteType === 'ZONE' 
                              ? "border-fiatlux-primary bg-blue-50/30" 
                              : "border-transparent hover:border-slate-200 hover:bg-slate-50/50"
                          )}
                          onClick={() => setSelectedItem(zone)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                              selectedItem?.id === zone.id ? "bg-fiatlux-primary text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                            )}>
                              <MapIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{zone.name}</p>
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{zone._count?.rules ?? 0} règles</p>
                            </div>
                          </div>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(zone);
                              setDeleteType('ZONE');
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                  <CardHeader className="pb-4 pt-8 px-8 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-black italic tracking-tight uppercase">Règles Tarifaires</CardTitle>
                      <CardDescription className="text-xs font-medium">Définissez les prix par distance pour vos zones.</CardDescription>
                    </div>
                    <Button 
                      onClick={() => {
                        setRuleFormData({ ...ruleFormData, zoneId: zones?.[0]?.id || '' });
                        setIsRuleModalOpen(true);
                      }}
                      className="h-10 rounded-xl bg-fiatlux-primary text-white font-bold px-6 shadow-lg shadow-blue-900/20 gap-2"
                      disabled={!zones || zones.length === 0}
                    >
                      <Plus className="w-4 h-4" />
                      Nouvelle règle
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                          <TableHead className="pl-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Zone</TableHead>
                          <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Distance (km)</TableHead>
                          <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Base (FCFA)</TableHead>
                          <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Supplément/km</TableHead>
                          <TableHead className="pr-8 py-5 text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingRules ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-48 text-center">
                              <Loader2 className="w-8 h-8 animate-spin text-fiatlux-primary mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : rules?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-48 text-center">
                              <AlertTriangle className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                              <p className="text-sm font-bold text-slate-400">Aucune règle définie</p>
                            </TableCell>
                          </TableRow>
                        ) : rules?.map((rule: any) => (
                          <TableRow key={rule.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="pl-8 py-5">
                              <Badge variant="outline" className="text-[10px] font-bold text-fiatlux-primary bg-blue-50 border-blue-100">
                                {rule.zone?.name}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-5">
                              <span className="text-sm font-bold text-slate-700">{rule.minDistance} - {rule.maxDistance} km</span>
                            </TableCell>
                            <TableCell className="py-5">
                              <span className="text-sm font-black text-slate-900">{rule.basePrice}</span>
                            </TableCell>
                            <TableCell className="py-5">
                              <span className="text-sm font-medium text-slate-500">+{rule.pricePerKm}/km</span>
                            </TableCell>
                            <TableCell className="pr-8 py-5 text-right">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedItem(rule);
                                  setDeleteType('RULE');
                                  setIsDeleteModalOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-900/10">
                    <Info className="w-6 h-6 text-fiatlux-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black italic tracking-tight text-slate-900 uppercase">Comment ça marche ?</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Le prix est calculé selon la distance entre le point de collecte et de livraison. 
                      Le système cherche la règle correspondante à la distance dans la zone concernée. 
                      Si aucune règle spécifique n'est trouvée, le tarif par défaut est appliqué.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="general" className="mt-8 outline-none">
            <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
              <CardContent className="p-20 text-center">
                <Settings className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-slate-900">Paramètres Généraux</h3>
                <p className="text-slate-500 mt-2">Bientôt disponible...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Zone Modal */}
      <Dialog open={isZoneModalOpen} onOpenChange={setIsZoneModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Nouvelle Zone</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Créez une zone pour regrouper vos règles de prix.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateZone} className="space-y-6 pt-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nom de la zone</Label>
              <Input 
                value={zoneFormData.name}
                onChange={e => setZoneFormData({ name: e.target.value })}
                placeholder="Ex: Brazzaville Centre"
                className="h-12 rounded-xl border-slate-200"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-fiatlux-primary text-white font-black uppercase h-12 rounded-xl" disabled={createZoneMutation.isPending}>
                {createZoneMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer la zone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rule Modal */}
      <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Nouvelle Règle</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Définissez les paliers tarifaires pour une zone spécifique.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRule} className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Zone cible</Label>
                <select 
                  value={ruleFormData.zoneId}
                  onChange={e => setRuleFormData({...ruleFormData, zoneId: e.target.value})}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none"
                  required
                >
                  {zones?.map((z: any) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Distance Min (km)</Label>
                  <Input 
                    type="number"
                    value={ruleFormData.minDistance}
                    onChange={e => setRuleFormData({...ruleFormData, minDistance: parseFloat(e.target.value)})}
                    className="h-12 rounded-xl border-slate-200"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Distance Max (km)</Label>
                  <Input 
                    type="number"
                    value={ruleFormData.maxDistance}
                    onChange={e => setRuleFormData({...ruleFormData, maxDistance: parseFloat(e.target.value)})}
                    className="h-12 rounded-xl border-slate-200"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Prix de base (FCFA)</Label>
                  <Input 
                    type="number"
                    value={ruleFormData.basePrice}
                    onChange={e => setRuleFormData({...ruleFormData, basePrice: parseFloat(e.target.value)})}
                    className="h-12 rounded-xl border-slate-200"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Supplément / km (FCFA)</Label>
                  <Input 
                    type="number"
                    value={ruleFormData.pricePerKm}
                    onChange={e => setRuleFormData({...ruleFormData, pricePerKm: parseFloat(e.target.value)})}
                    className="h-12 rounded-xl border-slate-200"
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-fiatlux-primary text-white font-black uppercase h-12 rounded-xl" disabled={createRuleMutation.isPending}>
                {createRuleMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enregistrer la règle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={deleteType === 'ZONE' ? "Supprimer la zone ?" : "Supprimer la règle ?"}
        description={deleteType === 'ZONE' 
          ? "Cela supprimera également toutes les règles associées à cette zone. Cette action est irréversible."
          : "Cette règle tarifaire ne sera plus appliquée aux nouveaux calculs de devis."}
        isLoading={deleteType === 'ZONE' ? deleteZoneMutation.isPending : deleteRuleMutation.isPending}
      />
    </DashboardLayout>
  );
}

function LandmarksTab() {
  const { data: landmarks, isLoading } = useLandmarks();
  const { data: zones } = usePricingZones();
  const createLandmark = useCreateLandmark();
  const updateLandmark = useUpdateLandmark();
  const deleteLandmark = useDeleteLandmark();

  const [form, setForm] = React.useState({ name: '', lat: '', lng: '', pricingZoneId: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.lat || !form.lng) {
      toast.error('Nom et coordonnées requis');
      return;
    }
    try {
      await createLandmark.mutateAsync({
        name: form.name,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        pricingZoneId: form.pricingZoneId || null,
      });
      toast.success('Repère créé');
      setForm({ name: '', lat: '', lng: '', pricingZoneId: '' });
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  const handleCoordChange = async (id: string, field: 'lat' | 'lng', value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    try {
      await updateLandmark.mutateAsync({ id, payload: { [field]: num } });
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleZoneChange = async (id: string, pricingZoneId: string) => {
    try {
      await updateLandmark.mutateAsync({ id, payload: { pricingZoneId: pricingZoneId || null } });
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await updateLandmark.mutateAsync({ id, payload: { active } });
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteLandmark.mutateAsync(id);
      toast.success(result.deactivated ? 'Repère désactivé (utilisé par des commandes)' : 'Repère supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="pb-4 pt-8 px-8">
            <CardTitle className="text-lg font-bold">Ajouter un repère</CardTitle>
            <CardDescription>
              Un lieu connu que les clients pourront chercher lors de la commande (ex: "Ngoyo Péage").
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleCreate} className="space-y-3">
              <Input
                placeholder="Nom du repère"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Latitude"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                />
                <Input
                  placeholder="Longitude"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                />
              </div>
              <select
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm"
                value={form.pricingZoneId}
                onChange={(e) => setForm({ ...form, pricingZoneId: e.target.value })}
              >
                <option value="">Aucune zone tarifaire liée</option>
                {zones?.map((z: any) => (
                  <option key={z.id} value={z.id}>{z.zoneName}</option>
                ))}
              </select>
              <Button type="submit" disabled={createLandmark.isPending} className="w-full">
                {createLandmark.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter'}
              </Button>
              <p className="text-[10px] text-slate-400">
                Coordonnées approximatives acceptées au départ — corrigez-les ici dès que vous avez la position exacte.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-fiatlux-primary" /></div>
            ) : !landmarks || landmarks.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">Aucun repère pour l'instant.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3 font-bold">Nom</th>
                    <th className="px-3 py-3 font-bold">Latitude</th>
                    <th className="px-3 py-3 font-bold">Longitude</th>
                    <th className="px-3 py-3 font-bold">Zone tarifaire</th>
                    <th className="px-3 py-3 font-bold">Actif</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {landmarks.map((lm: any) => (
                    <tr key={lm.id} className="border-b border-slate-50">
                      <td className="px-6 py-2 font-bold text-slate-800">{lm.name}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="any"
                          defaultValue={lm.lat}
                          onBlur={(e) => handleCoordChange(lm.id, 'lat', e.target.value)}
                          className="w-24 h-8 rounded border border-slate-200 px-2 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="any"
                          defaultValue={lm.lng}
                          onBlur={(e) => handleCoordChange(lm.id, 'lng', e.target.value)}
                          className="w-24 h-8 rounded border border-slate-200 px-2 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="h-8 rounded border border-slate-200 px-2 text-xs"
                          defaultValue={lm.pricingZoneId || ''}
                          onChange={(e) => handleZoneChange(lm.id, e.target.value)}
                        >
                          <option value="">—</option>
                          {zones?.map((z: any) => (
                            <option key={z.id} value={z.id}>{z.zoneName}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={lm.active}
                          onChange={(e) => handleToggleActive(lm.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDelete(lm.id)}
                          className="text-red-400 hover:text-red-600 text-xs font-bold"
                        >
                          Suppr.
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MotekiTab() {
  const { data: products, isLoading } = useMotekiProducts();
  const { data: rules } = usePricingRules();
  const createProduct = useCreateMotekiProduct();
  const updateProduct = useUpdateMotekiProduct();
  const deleteProduct = useDeleteMotekiProduct();

  const [form, setForm] = React.useState({ amount: '', productUuid: '', label: '' });

  // Montants réellement utilisés par vos tarifs, pour repérer facilement
  // ceux qui n'ont pas encore de produit Moteki associé.
  const knownAmounts = React.useMemo(() => {
    const amounts = new Set<number>();
    rules?.forEach((r: any) => { if (r.fixedAmount) amounts.add(r.fixedAmount); });
    return Array.from(amounts).sort((a, b) => a - b);
  }, [rules]);

  const mappedAmounts = new Set((products || []).map((p: any) => p.amount));
  const unmappedAmounts = knownAmounts.filter((a) => !mappedAmounts.has(a));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.productUuid) {
      toast.error('Montant et UUID produit requis');
      return;
    }
    try {
      await createProduct.mutateAsync({
        amount: parseInt(form.amount, 10),
        productUuid: form.productUuid,
        label: form.label || undefined,
      });
      toast.success('Correspondance créée');
      setForm({ amount: '', productUuid: '', label: '' });
    } catch {
      toast.error('Erreur lors de la création (montant déjà utilisé ?)');
    }
  };

  const handleUpdateUuid = async (id: string, productUuid: string) => {
    try {
      await updateProduct.mutateAsync({ id, payload: { productUuid } });
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct.mutateAsync(id);
      toast.success('Correspondance supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-sm text-amber-800">
        <p className="font-bold mb-1">Comment ça marche</p>
        <p>
          Moteki (notre passerelle Mtn/Airtel Money) fonctionne avec un catalogue de produits à prix
          fixe. Comme vos tarifs de livraison sont déjà fixes, créez un produit dans votre dashboard
          Moteki pour chaque montant ci-dessous, puis collez son UUID ici. Le paiement en ligne sera
          indisponible (repli automatique sur les espèces) pour tout montant sans correspondance.
        </p>
      </div>

      {unmappedAmounts.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-red-700 mb-1">Montants sans produit Moteki associé :</p>
          <p className="text-sm text-red-600 font-black">{unmappedAmounts.map((a) => `${a.toLocaleString()} FCFA`).join(' · ')}</p>
        </div>
      )}

      <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 pt-8 px-8">
          <CardTitle className="text-lg font-bold">Ajouter une correspondance</CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Montant (FCFA)"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              placeholder="UUID produit Moteki"
              className="md:col-span-2"
              value={form.productUuid}
              onChange={(e) => setForm({ ...form, productUuid: e.target.value })}
            />
            <Button type="submit" disabled={createProduct.isPending}>
              {createProduct.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-fiatlux-primary" /></div>
          ) : !products || products.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">Aucune correspondance configurée.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3 font-bold">Montant</th>
                  <th className="px-3 py-3 font-bold">UUID produit Moteki</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-50">
                    <td className="px-6 py-2 font-bold text-slate-800">{p.amount.toLocaleString()} FCFA</td>
                    <td className="px-3 py-2">
                      <input
                        defaultValue={p.productUuid}
                        onBlur={(e) => handleUpdateUuid(p.id, e.target.value)}
                        className="w-full h-8 rounded border border-slate-200 px-2 text-xs font-mono"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 text-xs font-bold">
                        Suppr.
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
