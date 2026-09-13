'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChauffeurLayout } from '@/components/layout/chauffeur-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, MapPinPlus, Info, CheckCircle2 } from 'lucide-react';
import { useCreateManualOrder } from '@/hooks/use-rider-portal';
import { getCurrentPositionWithReason, geoErrorMessage } from '@/services/rider-portal.service';

const PRICE_TIERS = [1000, 1500, 2000] as const;

export default function NouvelleCoursePage() {
  const router = useRouter();
  const createManualOrder = useCreateManualOrder();

  const [description, setDescription] = React.useState('');
  const [priceTier, setPriceTier] = React.useState<number | 'AUTRE'>(1000);
  const [customAmount, setCustomAmount] = React.useState('');
  const [note, setNote] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Décrivez brièvement la course');
      return;
    }
    const amount = priceTier === 'AUTRE' ? parseInt(customAmount, 10) : priceTier;
    if (!amount || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    const geo = await getCurrentPositionWithReason();
    if (!geo.ok) {
      toast.error(geoErrorMessage(geo.reason));
      return;
    }

    try {
      await createManualOrder.mutateAsync({
        description: description.trim(),
        amount,
        note: note.trim() || undefined,
        lat: geo.position.lat,
        lng: geo.position.lng,
      });
      toast.success('Course enregistrée — comptabilisée dans vos recettes.');
      router.push('/chauffeur/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Impossible d'enregistrer la course");
    }
  };

  return (
    <ChauffeurLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-black text-slate-900">Course hors plateforme</h1>
          <p className="text-xs text-slate-500 font-medium">Vous avez pris une course directement sur la route ? Enregistrez-la ici.</p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-fiatlux-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-fiatlux-primary font-medium leading-relaxed">
            Cette course sera comptée comme livrée et payée dans vos statistiques et dans les recettes de l&apos;entreprise.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600">Qu&apos;avez-vous livré ?</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Colis pour un client au marché"
              className="h-11 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600">Montant encaissé</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRICE_TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setPriceTier(tier)}
                  className={`h-11 rounded-lg border-2 text-xs font-bold transition-colors ${priceTier === tier ? 'border-fiatlux-primary bg-blue-50 text-fiatlux-primary' : 'border-slate-100 text-slate-500'}`}
                >
                  {tier.toLocaleString()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPriceTier('AUTRE')}
                className={`h-11 rounded-lg border-2 text-xs font-bold transition-colors ${priceTier === 'AUTRE' ? 'border-fiatlux-primary bg-blue-50 text-fiatlux-primary' : 'border-slate-100 text-slate-500'}`}
              >
                Autre
              </button>
            </div>
            {priceTier === 'AUTRE' && (
              <Input
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                type="number"
                placeholder="Montant en FCFA"
                className="h-11 text-sm mt-2"
                autoFocus
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600">Note (optionnel)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Quartier Tié-Tié, client rencontré près du marché"
              className="text-sm min-h-[70px]"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <MapPinPlus className="w-3.5 h-3.5 shrink-0" />
            Votre position actuelle sera enregistrée comme repère de cette course.
          </div>

          <Button
            type="submit"
            disabled={createManualOrder.isPending}
            className="w-full h-12 bg-fiatlux-primary hover:bg-[#0d4270] text-white font-black uppercase tracking-wider text-xs"
          >
            {createManualOrder.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Enregistrer la course</>
            )}
          </Button>
        </form>
      </div>
    </ChauffeurLayout>
  );
}