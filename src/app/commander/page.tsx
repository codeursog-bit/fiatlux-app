'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  MapPin, 
  User, 
  Phone, 
  CreditCard, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Info,
  Camera,
  Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { PublicOrderService } from '@/services/public-order.service';
import { LandmarkAutocomplete, LandmarkSelection } from '@/components/commander/landmark-autocomplete';
import { RoutePreviewMap } from '@/components/commander/route-preview-map';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';

const PRICE_TIERS = ['1000', '1500', '2000', 'DEVIS'] as const;

const orderSchema = z.object({
  // Type de commande (Étape 1)
  deliveryType: z.enum(['SELF', 'THIRD_PARTY']),

  // Sender (Step 1)
  guestCustomerName: z.string().min(2, 'Nom requis'),
  guestCustomerPhone: z.string().min(8, 'Téléphone valide requis'),
  pickupAddress: z.string().min(5, 'Adresse précise requise'),
  pickupLandmark: z.string().optional(),
  
  // Recipient (Step 2) — requis seulement si la livraison est pour une autre personne
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  dropoffAddress: z.string().min(5, 'Adresse de livraison requise'),
  dropoffLandmark: z.string().optional(),
  
  // Package (Step 3)
  packageDescription: z.string().min(5, 'Description courte requise'),
  weightCategory: z.enum(['LÉGER', 'MOYEN', 'LOURD']),
  declaredValue: z.string().optional(),

  // Mode de collecte — uniquement pertinent pour une commande "Moi-même" :
  // pas de tiers avec l'app en main au point de collecte, donc le client
  // choisit s'il laisse l'app gérer (vérif GPS seule) ou s'il garde le
  // contrôle (confirme lui-même via son lien de suivi, comme un expéditeur).
  pickupControlMode: z.enum(['AUTO', 'MANUAL']).optional(),

  // Tarif & Paiement (Step 4)
  priceTier: z.enum(PRICE_TIERS),
  paymentMethod: z.enum(['ONLINE', 'CASH']),
  cashPaymentSubtype: z.enum(['SENDER_PAYS', 'RECIPIENT_PAYS']).optional(),
}).superRefine((values, ctx) => {
  if (values.deliveryType === 'THIRD_PARTY') {
    if (!values.recipientName || values.recipientName.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recipientName'], message: 'Nom du destinataire requis' });
    }
    if (!values.recipientPhone || values.recipientPhone.trim().length < 8) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recipientPhone'], message: 'Téléphone destinataire requis' });
    }
  }
  if (values.deliveryType === 'SELF' && !values.pickupControlMode) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pickupControlMode'], message: 'Choisissez un mode de collecte' });
  }
});

type OrderFormValues = z.infer<typeof orderSchema>;

function CommanderContent() {
  const [step, setStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      deliveryType: 'THIRD_PARTY',
      weightCategory: 'LÉGER',
      priceTier: '1000',
      paymentMethod: 'CASH',
      cashPaymentSubtype: 'SENDER_PAYS',
      guestCustomerName: searchParams.get('name') || '',
      guestCustomerPhone: searchParams.get('phone') || '',
      pickupAddress: searchParams.get('address') || '',
    },
  });

  React.useEffect(() => {
    if (searchParams.get('prefilled') === 'true') {
      toast.info('Informations de compte pré-remplies');
    }
  }, [searchParams]);

  const [pickupSelection, setPickupSelection] = React.useState<LandmarkSelection | null>(null);
  const [dropoffSelection, setDropoffSelection] = React.useState<LandmarkSelection | null>(null);

  const watchPriceTier = form.watch('priceTier');
  const watchDeliveryType = form.watch('deliveryType');
  const estimatedPrice = watchPriceTier === 'DEVIS' ? null : parseInt(watchPriceTier, 10);
  const isOnQuote = watchPriceTier === 'DEVIS';
  const watchPaymentMethod = form.watch('paymentMethod');

  const onSubmit = async (values: OrderFormValues) => {
    if (!pickupSelection || !dropoffSelection) {
      toast.error('Points de collecte et de livraison requis');
      return;
    }
    setIsSubmitting(true);
    try {
      // Le backend n'a pas de valeur "CASH" générique dans son enum —
      // il attend CASH_AT_PICKUP ou CASH_AT_DELIVERY selon qui paie.
      const resolvedPaymentMethod =
        values.paymentMethod === 'ONLINE'
          ? 'ONLINE'
          : values.cashPaymentSubtype === 'RECIPIENT_PAYS'
          ? 'CASH_AT_DELIVERY'
          : 'CASH_AT_PICKUP';

      // Le tarif est toujours choisi manuellement (1000 / 1500 / 2000 FCFA),
      // jamais calculé automatiquement par zone/distance. "Sur devis" laisse
      // le montant final à la charge de l'admin (quotedManually = true).
      const amount = values.priceTier === 'DEVIS' ? 0 : parseInt(values.priceTier, 10);
      const quotedManually = values.priceTier === 'DEVIS';

      // Livraison pour soi-même : le destinataire est l'expéditeur lui-même.
      const recipientName = values.deliveryType === 'SELF' ? values.guestCustomerName : values.recipientName!;
      const recipientPhone = values.deliveryType === 'SELF' ? values.guestCustomerPhone : values.recipientPhone!;

      const payload = {
        ...values,
        recipientName,
        recipientPhone,
        paymentMethod: resolvedPaymentMethod,
        amount,
        quotedManually,
        pickupLat: pickupSelection.lat,
        pickupLng: pickupSelection.lng,
        pickupLandmarkId: pickupSelection.landmarkId,
        dropoffLat: dropoffSelection.lat,
        dropoffLng: dropoffSelection.lng,
        dropoffLandmarkId: dropoffSelection.landmarkId,
        status: 'PENDING',
        packageWeight: values.weightCategory,
        declaredValue: values.declaredValue ? parseFloat(values.declaredValue) : 0,
      };

      const result = await PublicOrderService.createPublicOrder(payload);
      
      if (values.paymentMethod === 'ONLINE' && !isOnQuote) {
        router.push(`/paiement/${result.orderId}`);
      } else {
        const rtokenParam = result.recipientToken ? `&rtoken=${result.recipientToken}` : '';
        router.push(`/commander/confirmation/${result.trackingNumber}?token=${result.senderToken}${rtokenParam}`);
      }
      toast.success('Commande enregistrée !');
    } catch (error) {
      toast.error('Erreur lors de la création de la commande');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof OrderFormValues)[] = [];
    if (step === 1) fieldsToValidate = ['guestCustomerName', 'guestCustomerPhone', 'pickupAddress'];
    if (step === 2) {
      fieldsToValidate = watchDeliveryType === 'THIRD_PARTY'
        ? ['recipientName', 'recipientPhone', 'dropoffAddress']
        : ['dropoffAddress'];
    }
    if (step === 3) fieldsToValidate = ['packageDescription', 'weightCategory'];

    if (step === 1 && !pickupSelection) {
      toast.error('Choisissez un point de collecte (repère ou position GPS)');
      return;
    }
    if (step === 2 && !dropoffSelection) {
      toast.error('Choisissez un point de livraison (repère ou position GPS)');
      return;
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-50 px-4 h-16 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg">Nouvelle Commande</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <div className="max-w-md mx-auto px-4 pt-6">
        {/* Stepper */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                step >= i ? "bg-fiatlux-primary" : "bg-neutral-200"
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h2 className="text-2xl font-black tracking-tight">Expéditeur</h2>

                  <div className="space-y-2">
                    <Label className="font-bold">Cette commande est pour</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => form.setValue('deliveryType', 'THIRD_PARTY')}
                        className={cn(
                          "flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all",
                          watchDeliveryType === 'THIRD_PARTY' ? "border-fiatlux-primary bg-blue-50 ring-2 ring-fiatlux-primary/20" : "border-neutral-100 bg-white"
                        )}
                      >
                        <span className="font-black text-sm">Une autre personne</span>
                        <span className="text-[10px] text-neutral-500 leading-tight mt-1">Livrer un colis à quelqu&apos;un</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => form.setValue('deliveryType', 'SELF')}
                        className={cn(
                          "flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all",
                          watchDeliveryType === 'SELF' ? "border-fiatlux-primary bg-blue-50 ring-2 ring-fiatlux-primary/20" : "border-neutral-100 bg-white"
                        )}
                      >
                        <span className="font-black text-sm">Moi-même</span>
                        <span className="text-[10px] text-neutral-500 leading-tight mt-1">Achat à récupérer et me livrer</span>
                      </button>
                    </div>
                  </div>

                  {watchDeliveryType === 'SELF' && (
                    <div className="space-y-2">
                      <Label className="font-bold">À la collecte, vous préférez</Label>
                      <div className="grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          onClick={() => form.setValue('pickupControlMode', 'AUTO')}
                          className={cn(
                            "flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all",
                            form.watch('pickupControlMode') === 'AUTO' ? "border-fiatlux-primary bg-blue-50 ring-2 ring-fiatlux-primary/20" : "border-neutral-100 bg-white"
                          )}
                        >
                          <span className="font-black text-sm">Laisser la main à l&apos;app</span>
                          <span className="text-[10px] text-neutral-500 leading-tight mt-1">Le chauffeur avance dès qu&apos;il est vérifié sur place (position GPS), sans attendre votre confirmation.</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => form.setValue('pickupControlMode', 'MANUAL')}
                          className={cn(
                            "flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all",
                            form.watch('pickupControlMode') === 'MANUAL' ? "border-fiatlux-primary bg-blue-50 ring-2 ring-fiatlux-primary/20" : "border-neutral-100 bg-white"
                          )}
                        >
                          <span className="font-black text-sm">Garder le contrôle</span>
                          <span className="text-[10px] text-neutral-500 leading-tight mt-1">Le chauffeur attend votre confirmation (via votre lien de suivi) avant de repartir avec le produit.</span>
                        </button>
                      </div>
                      {form.formState.errors.pickupControlMode && (
                        <p className="text-red-500 text-xs font-bold">{form.formState.errors.pickupControlMode.message}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="font-bold">Votre nom complet</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                      <Input {...form.register('guestCustomerName')} placeholder="Ex: Marc Lando" className="h-14 pl-12 rounded-2xl border-2" />
                    </div>
                    {form.formState.errors.guestCustomerName && <p className="text-red-500 text-xs font-bold">{form.formState.errors.guestCustomerName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Téléphone (WhatsApp recommandé)</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                      <Input {...form.register('guestCustomerPhone')} placeholder="Ex: 06 600 00 00" className="h-14 pl-12 rounded-2xl border-2" />
                    </div>
                    {form.formState.errors.guestCustomerPhone && <p className="text-red-500 text-xs font-bold">{form.formState.errors.guestCustomerPhone.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">{watchDeliveryType === 'SELF' ? "Point de collecte de l'achat" : 'Point de collecte'}</Label>
                    <LandmarkAutocomplete
                      placeholder="Ex: Ngoyo Péage, Tchimbamba SNE..."
                      onSelect={setPickupSelection}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Adresse précise</Label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-4 h-5 w-5 text-neutral-400" />
                      <Textarea {...form.register('pickupAddress')} placeholder="Rue, N°, Description..." className="pl-12 rounded-2xl border-2 min-h-[100px]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Repère visuel (Optionnel)</Label>
                    <Input {...form.register('pickupLandmark')} placeholder="Ex: Portail bleu, à côté de l'église" className="h-14 rounded-2xl border-2" />
                  </div>
                </div>
                <Button type="button" onClick={nextStep} className="w-full h-16 rounded-2xl text-xl font-bold gap-2">
                  Continuer <ArrowRight className="h-6 w-6" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h2 className="text-2xl font-black tracking-tight">
                    {watchDeliveryType === 'SELF' ? 'Livraison' : 'Destinataire'}
                  </h2>

                  {watchDeliveryType === 'SELF' ? (
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl text-fiatlux-primary">
                      <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-medium leading-relaxed">
                        Le colis vous sera livré directement, à l&apos;adresse que vous indiquez ci-dessous.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="font-bold">Nom du destinataire</Label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                          <Input {...form.register('recipientName')} placeholder="Ex: Julie Mbemba" className="h-14 pl-12 rounded-2xl border-2" />
                        </div>
                        {form.formState.errors.recipientName && <p className="text-red-500 text-xs font-bold">{form.formState.errors.recipientName.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold">Téléphone destinataire</Label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                          <Input {...form.register('recipientPhone')} placeholder="Ex: 05 500 00 00" className="h-14 pl-12 rounded-2xl border-2" />
                        </div>
                        {form.formState.errors.recipientPhone && <p className="text-red-500 text-xs font-bold">{form.formState.errors.recipientPhone.message}</p>}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label className="font-bold">Point de livraison</Label>
                    <LandmarkAutocomplete
                      placeholder="Ex: Rond-point Lumumba, Loandjili..."
                      onSelect={setDropoffSelection}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Adresse de livraison</Label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-4 h-5 w-5 text-neutral-400" />
                      <Textarea {...form.register('dropoffAddress')} placeholder="Où livrer le colis ?" className="pl-12 rounded-2xl border-2 min-h-[100px]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Repère (Optionnel)</Label>
                    <Input {...form.register('dropoffLandmark')} placeholder="Ex: Devant le marché" className="h-14 rounded-2xl border-2" />
                  </div>

                  {/* Aperçu automatique de l'itinéraire dès que les deux points
                      sont choisis via l'autocomplete — pas besoin de cliquer
                      soi-même sur la carte, l'app dessine le trajet réel. */}
                  {pickupSelection && dropoffSelection && (
                    <RoutePreviewMap pickup={pickupSelection} dropoff={dropoffSelection} />
                  )}
                </div>
                <Button type="button" onClick={nextStep} className="w-full h-16 rounded-2xl text-xl font-bold gap-2">
                  Continuer <ArrowRight className="h-6 w-6" />
                </Button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h2 className="text-2xl font-black tracking-tight">Le Colis</h2>
                  <div className="space-y-2">
                    <Label className="font-bold">Description du contenu</Label>
                    <div className="relative">
                      <Package className="absolute left-4 top-4 h-5 w-5 text-neutral-400" />
                      <Textarea {...form.register('packageDescription')} placeholder="Ex: Plis confidentiels, Repas, Vêtements..." className="pl-12 rounded-2xl border-2 min-h-[100px]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Poids approximatif</Label>
                    <Select onValueChange={(val) => form.setValue('weightCategory', val as any)} defaultValue="LÉGER">
                      <SelectTrigger className="h-14 rounded-2xl border-2">
                        <div className="flex items-center gap-2">
                          <Scale className="h-5 w-5 text-neutral-400" />
                          <SelectValue placeholder="Choisir le poids" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LÉGER">Léger (Moins de 2kg)</SelectItem>
                        <SelectItem value="MOYEN">Moyen (2kg à 5kg)</SelectItem>
                        <SelectItem value="LOURD">Lourd (Plus de 5kg)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Valeur déclarée (FCFA - Optionnel)</Label>
                    <Input {...form.register('declaredValue')} type="number" placeholder="Ex: 50000" className="h-14 rounded-2xl border-2" />
                    <p className="text-[10px] text-neutral-400 leading-tight">Recommandé pour les documents/objets de valeur (ex: chèques, bijoux).</p>
                  </div>

                  <div className="pt-2">
                    <Label className="font-bold mb-2 block">Photo du colis (Optionnel)</Label>
                    <div className="border-2 border-dashed border-neutral-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-2 text-neutral-400 hover:border-fiatlux-primary hover:text-fiatlux-primary transition-all cursor-pointer bg-white">
                      <Camera className="h-8 w-8" />
                      <span className="font-bold text-sm">Prendre une photo</span>
                    </div>
                  </div>
                </div>
                <Button type="button" onClick={nextStep} className="w-full h-16 rounded-2xl text-xl font-bold gap-2">
                  Continuer <ArrowRight className="h-6 w-6" />
                </Button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-6">
                  <h2 className="text-2xl font-black tracking-tight">Tarif & Règlement</h2>

                  <div className="space-y-3">
                    <Label className="font-bold block text-lg">Montant de la course</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['1000', '1500', '2000'] as const).map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => form.setValue('priceTier', tier)}
                          className={cn(
                            "flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all",
                            watchPriceTier === tier ? "border-fiatlux-primary bg-blue-50 ring-2 ring-fiatlux-primary/20" : "border-neutral-100 bg-white"
                          )}
                        >
                          <span className="text-2xl font-black">{parseInt(tier).toLocaleString()}</span>
                          <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">FCFA</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => form.setValue('priceTier', 'DEVIS')}
                        className={cn(
                          "flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all",
                          watchPriceTier === 'DEVIS' ? "border-fiatlux-primary bg-blue-50 ring-2 ring-fiatlux-primary/20" : "border-neutral-100 bg-white"
                        )}
                      >
                        <span className="text-lg font-black">Sur devis</span>
                        <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Colis volumineux</span>
                      </button>
                    </div>
                  </div>

                  <Card className="rounded-3xl border-0 bg-blue-600 text-white shadow-xl shadow-blue-100 overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-blue-100 font-bold uppercase tracking-wider text-xs">Total</span>
                        <Package className="h-5 w-5 text-blue-200" />
                      </div>
                      <div className="text-4xl font-black italic">
                        {estimatedPrice ? `${estimatedPrice.toLocaleString()} FCFA` : "Sur devis"}
                      </div>
                      {isOnQuote && (
                        <p className="mt-2 text-blue-100 text-sm font-medium">
                          Notre équipe vous recontactera avec un montant final.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <Label className="font-bold block text-lg">Comment souhaitez-vous payer ?</Label>
                    <RadioGroup 
                      onValueChange={(v) => form.setValue('paymentMethod', v as any)} 
                      defaultValue={form.getValues('paymentMethod')}
                      className="space-y-3"
                    >
                      <div className="relative">
                        <RadioGroupItem value="ONLINE" id="online" className="sr-only" disabled={isOnQuote} />
                        <Label
                          htmlFor="online"
                          className={cn(
                            "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer",
                            watchPaymentMethod === 'ONLINE' ? "border-fiatlux-primary bg-blue-50 ring-2 ring-fiatlux-primary/20" : "border-neutral-100 bg-white",
                            isOnQuote && "opacity-50 grayscale pointer-events-none"
                          )}
                        >
                          <div className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center", watchPaymentMethod === 'ONLINE' ? "border-fiatlux-primary" : "border-neutral-200")}>
                            {watchPaymentMethod === 'ONLINE' && <div className="h-3 w-3 rounded-full bg-fiatlux-primary" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-black">Payer en ligne maintenant</p>
                            <p className="text-xs text-neutral-500">Mobile Money (MTN, Airtel)</p>
                          </div>
                          <CreditCard className="h-6 w-6 text-fiatlux-primary" />
                        </Label>
                      </div>

                      <div className="relative">
                        <RadioGroupItem value="CASH" id="cash" className="sr-only" />
                        <Label
                          htmlFor="cash"
                          className={cn(
                            "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer",
                            watchPaymentMethod === 'CASH' ? "border-fiatlux-primary bg-blue-50 ring-2 ring-fiatlux-primary/20" : "border-neutral-100 bg-white"
                          )}
                        >
                          <div className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center", watchPaymentMethod === 'CASH' ? "border-fiatlux-primary" : "border-neutral-200")}>
                            {watchPaymentMethod === 'CASH' && <div className="h-3 w-3 rounded-full bg-fiatlux-primary" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-black">Payer en espèces</p>
                            <p className="text-xs text-neutral-500">Règlement au livreur</p>
                          </div>
                          <CheckCircle2 className="h-6 w-6 text-neutral-400" />
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <AnimatePresence>
                    {watchPaymentMethod === 'CASH' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white rounded-3xl p-5 border-2 border-neutral-100 space-y-4"
                      >
                        <Label className="font-bold block">Précision du paiement espèces</Label>
                        <RadioGroup 
                          onValueChange={(v) => form.setValue('cashPaymentSubtype', v as any)} 
                          defaultValue={form.getValues('cashPaymentSubtype')}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                        >
                          <div>
                            <RadioGroupItem value="SENDER_PAYS" id="sender" className="sr-only" />
                            <Label 
                              htmlFor="sender"
                              className={cn(
                                "flex flex-col items-center justify-center p-4 border-2 rounded-2xl h-full text-center transition-all cursor-pointer",
                                form.watch('cashPaymentSubtype') === 'SENDER_PAYS' ? "border-fiatlux-primary bg-blue-50/50" : "border-neutral-100"
                              )}
                            >
                              <span className="text-xs font-black uppercase tracking-tighter mb-1">À la collecte</span>
                              <span className="text-[10px] text-neutral-500 leading-none italic">J'assume les frais</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="RECIPIENT_PAYS" id="recipient" className="sr-only" />
                            <Label 
                              htmlFor="recipient"
                              className={cn(
                                "flex flex-col items-center justify-center p-4 border-2 rounded-2xl h-full text-center transition-all cursor-pointer",
                                form.watch('cashPaymentSubtype') === 'RECIPIENT_PAYS' ? "border-fiatlux-primary bg-blue-50/50" : "border-neutral-100"
                              )}
                            >
                              <span className="text-xs font-black uppercase tracking-tighter mb-1">À la livraison</span>
                              <span className="text-[10px] text-neutral-500 leading-none italic">Le destinataire paie</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-2xl text-orange-700">
                    <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <p className="text-xs font-medium leading-relaxed">
                      En confirmant, vous acceptez nos CGV. Un lien de suivi sera envoyé par SMS/WhatsApp aux deux parties dès validation.
                    </p>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full h-16 rounded-2xl text-xl font-bold gap-2 shadow-xl shadow-blue-200"
                >
                  {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : "Confirmer la commande"}
                </Button>
              </motion.div>
            )}
          </form>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function CommanderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-neutral-50"><Loader2 className="w-10 h-10 animate-spin text-fiatlux-primary" /></div>}>
      <CommanderContent />
    </Suspense>
  );
}