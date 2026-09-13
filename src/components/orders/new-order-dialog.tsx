'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Truck, User, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { LandmarkAutocomplete, LandmarkSelection } from '@/components/commander/landmark-autocomplete';
import { useCreateOrder } from '@/hooks/use-orders';
import { cn } from '@/lib/utils';

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRICE_TIERS = [1000, 1500, 2000] as const;

export function NewOrderDialog({ open, onOpenChange }: NewOrderDialogProps) {
  const createOrder = useCreateOrder();

  const [deliveryType, setDeliveryType] = React.useState<'SELF' | 'THIRD_PARTY'>('THIRD_PARTY');
  const [pickupControlMode, setPickupControlMode] = React.useState<'AUTO' | 'MANUAL' | ''>('');

  const [senderName, setSenderName] = React.useState('');
  const [senderPhone, setSenderPhone] = React.useState('');
  const [pickupAddress, setPickupAddress] = React.useState('');
  const [pickupSelection, setPickupSelection] = React.useState<LandmarkSelection | null>(null);

  const [receiverName, setReceiverName] = React.useState('');
  const [receiverPhone, setReceiverPhone] = React.useState('');
  const [dropoffAddress, setDropoffAddress] = React.useState('');
  const [dropoffSelection, setDropoffSelection] = React.useState<LandmarkSelection | null>(null);

  const [description, setDescription] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<'CASH_AT_PICKUP' | 'CASH_AT_DELIVERY' | 'ONLINE'>('CASH_AT_PICKUP');

  // Tarif toujours choisi manuellement — jamais calculé automatiquement par
  // zone/distance. "Sur devis" laisse la saisie libre du montant négocié.
  const [priceTier, setPriceTier] = React.useState<typeof PRICE_TIERS[number] | 'DEVIS'>(1000);
  const [manualAmount, setManualAmount] = React.useState('');

  const resetForm = () => {
    setDeliveryType('THIRD_PARTY'); setPickupControlMode('');
    setSenderName(''); setSenderPhone(''); setPickupAddress(''); setPickupSelection(null);
    setReceiverName(''); setReceiverPhone(''); setDropoffAddress(''); setDropoffSelection(null);
    setDescription(''); setPaymentMethod('CASH_AT_PICKUP'); setPriceTier(1000); setManualAmount('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!senderName || !senderPhone || !pickupAddress || !pickupSelection) {
      toast.error('Informations expéditeur incomplètes (repère de collecte requis)');
      return;
    }
    if (!dropoffAddress || !dropoffSelection) {
      toast.error('Point de livraison requis');
      return;
    }
    if (deliveryType === 'THIRD_PARTY' && (!receiverName || !receiverPhone)) {
      toast.error('Informations destinataire incomplètes');
      return;
    }
    if (deliveryType === 'SELF' && !pickupControlMode) {
      toast.error('Choisissez un mode de collecte pour cette commande "Moi-même"');
      return;
    }
    if (!description) {
      toast.error('Description du colis requise');
      return;
    }

    const amount = priceTier === 'DEVIS' ? parseInt(manualAmount, 10) : priceTier;
    if (!amount || amount <= 0) {
      toast.error('Montant invalide — choisissez un palier ou saisissez le montant sur devis');
      return;
    }

    try {
      await createOrder.mutateAsync({
        guestCustomerName: senderName,
        guestCustomerPhone: senderPhone,
        pickupAddress,
        pickupLat: pickupSelection.lat,
        pickupLng: pickupSelection.lng,
        dropoffAddress,
        dropoffLat: dropoffSelection.lat,
        dropoffLng: dropoffSelection.lng,
        recipientName: deliveryType === 'SELF' ? senderName : receiverName,
        recipientPhone: deliveryType === 'SELF' ? senderPhone : receiverPhone,
        packageDescription: description,
        amount,
        quotedManually: priceTier === 'DEVIS',
        paymentMethod,
        deliveryType,
        pickupControlMode: deliveryType === 'SELF' ? pickupControlMode : undefined,
      });
      toast.success('Commande créée');
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erreur lors de la création de la commande');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-fiatlux-primary" />
            Nouvelle Commande Manuelle
          </DialogTitle>
          <DialogDescription>
            Enregistrez une commande reçue par téléphone ou WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase text-slate-500">Cette commande est pour</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryType('THIRD_PARTY')}
                className={cn(
                  "h-9 rounded-md border text-xs font-bold transition-colors",
                  deliveryType === 'THIRD_PARTY' ? "border-fiatlux-primary bg-blue-50 text-fiatlux-primary" : "border-slate-200 text-slate-500"
                )}
              >
                Une autre personne
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType('SELF')}
                className={cn(
                  "h-9 rounded-md border text-xs font-bold transition-colors",
                  deliveryType === 'SELF' ? "border-fiatlux-primary bg-blue-50 text-fiatlux-primary" : "border-slate-200 text-slate-500"
                )}
              >
                L&apos;expéditeur lui-même
              </button>
            </div>
          </div>

          {deliveryType === 'SELF' && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-500">À la collecte, le client préfère</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPickupControlMode('AUTO')}
                  className={cn(
                    "h-auto py-2 px-2 rounded-md border text-[11px] font-bold text-left transition-colors leading-snug",
                    pickupControlMode === 'AUTO' ? "border-fiatlux-primary bg-blue-50 text-fiatlux-primary" : "border-slate-200 text-slate-500"
                  )}
                >
                  Laisser la main à l&apos;app
                  <span className="block font-normal text-[10px] opacity-70 mt-0.5">Vérif. GPS uniquement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPickupControlMode('MANUAL')}
                  className={cn(
                    "h-auto py-2 px-2 rounded-md border text-[11px] font-bold text-left transition-colors leading-snug",
                    pickupControlMode === 'MANUAL' ? "border-fiatlux-primary bg-blue-50 text-fiatlux-primary" : "border-slate-200 text-slate-500"
                  )}
                >
                  Garder le contrôle
                  <span className="block font-normal text-[10px] opacity-70 mt-0.5">Confirme via son lien</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sender Information */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3 h-3" /> Expéditeur
              </h3>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Nom complet</Label>
                <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Ex: Jean Martin" className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Téléphone</Label>
                <Input value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} placeholder="+242 06 000 00 00" className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Point de collecte</Label>
                <LandmarkAutocomplete placeholder="Ex: Ngoyo Péage..." onSelect={setPickupSelection} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Adresse précise</Label>
                <Input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Quartier, Rue, N°" className="h-9 text-xs" />
              </div>
            </div>

            {/* Receiver Information */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-3 h-3" /> Destinataire
              </h3>
              {deliveryType === 'SELF' ? (
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md text-fiatlux-primary">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <p className="text-[11px] leading-relaxed">Le colis sera livré à l&apos;expéditeur lui-même.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Nom complet</Label>
                    <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Ex: Marie Koumba" className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Téléphone</Label>
                    <Input value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} placeholder="+242 05 000 00 00" className="h-9 text-xs" />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Point de livraison</Label>
                <LandmarkAutocomplete placeholder="Ex: Rond-point Lumumba..." onSelect={setDropoffSelection} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Adresse précise</Label>
                <Input value={dropoffAddress} onChange={(e) => setDropoffAddress(e.target.value)} placeholder="Quartier, Rue, N°" className="h-9 text-xs" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Détails de l&apos;envoi</h3>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Description du colis</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Documents, Vêtements, Déjeuner..." className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Montant (FCFA)</Label>
              <div className="grid grid-cols-4 gap-2">
                {PRICE_TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setPriceTier(tier)}
                    className={cn(
                      "h-9 rounded-md border text-xs font-bold transition-colors",
                      priceTier === tier ? "border-fiatlux-primary bg-blue-50 text-fiatlux-primary" : "border-slate-200 text-slate-600"
                    )}
                  >
                    {tier.toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPriceTier('DEVIS')}
                  className={cn(
                    "h-9 rounded-md border text-xs font-bold transition-colors",
                    priceTier === 'DEVIS' ? "border-fiatlux-primary bg-blue-50 text-fiatlux-primary" : "border-slate-200 text-slate-600"
                  )}
                >
                  Devis
                </button>
              </div>
              {priceTier === 'DEVIS' && (
                <Input
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  type="number"
                  placeholder="Montant négocié (FCFA)"
                  className="h-9 text-xs mt-2"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Mode de paiement</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="h-9 w-full rounded-md border border-slate-200 px-3 text-xs"
              >
                <option value="CASH_AT_PICKUP">Espèces — à la collecte</option>
                <option value="CASH_AT_DELIVERY">Espèces — à la livraison</option>
                <option value="ONLINE">En ligne (Mobile Money)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 text-xs font-bold uppercase tracking-wider">
              Annuler
            </Button>
            <Button type="submit" disabled={createOrder.isPending} className="h-10 bg-fiatlux-primary hover:bg-[#0d4270] text-white px-8 font-bold uppercase tracking-wider text-xs">
              {createOrder.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer la commande'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}