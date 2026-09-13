'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Smartphone,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Loader2,
  XCircle,
  Wallet,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PaymentService } from '@/services/payment.service';
import { usePaymentStatus } from '@/hooks/use-payment-status';
import { cn } from '@/lib/utils';

export default function PaymentPage() {
  const { orderId } = useParams();
  const router = useRouter();

  const [operator, setOperator] = React.useState<'MTN' | 'AIRTEL'>('MTN');
  const [phone, setPhone] = React.useState('');
  const [paymentId, setPaymentId] = React.useState<string | null>(null);
  const [isInitiating, setIsInitiating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [orderInfo, setOrderInfo] = React.useState<{ trackingNumber: string; amount: number; packageDescription: string; senderToken: string; recipientToken: string | null } | null>(null);

  React.useEffect(() => {
    if (!orderId) return;
    PaymentService.getOrderInfo(orderId as string)
      .then(setOrderInfo)
      .catch(() => setError('Impossible de charger les informations de la commande.'));
  }, [orderId]);

  // Polling for payment status
  const { data: statusData, isLoading: isPolling } = usePaymentStatus(paymentId);

  React.useEffect(() => {
    if (statusData?.status === 'SUCCESS') {
      toast.success('Paiement confirmé !');
      const rtokenParam = orderInfo?.recipientToken ? `&rtoken=${orderInfo.recipientToken}` : '';
      router.push(`/commander/confirmation/${statusData.trackingNumber}?token=${orderInfo?.senderToken || ''}${rtokenParam}`);
    } else if (statusData?.status === 'FAILED') {
      setError('Le paiement a échoué. Veuillez réessayer ou choisir un autre mode de paiement.');
      setPaymentId(null);
    }
  }, [statusData, router, orderInfo]);

  const handleInitiatePayment = async () => {
    if (!phone || phone.length < 8) {
      toast.error('Veuillez entrer un numéro de téléphone valide');
      return;
    }

    setIsInitiating(true);
    setError(null);
    try {
      const response = await PaymentService.initiate(orderId as string, operator, phone);
      setPaymentId(response.paymentId);

      if (response.redirectUrl) {
        // On ouvre la page de paiement Moteki/CinetPay dans un nouvel
        // onglet plutôt que de rediriger — aucun mécanisme de retour
        // automatique (return_url) n'est documenté côté Moteki. On
        // continue de sonder le statut depuis cet onglet FiatLux.
        window.open(response.redirectUrl, '_blank', 'noopener,noreferrer');
        toast.info('Finalisez le paiement dans le nouvel onglet ouvert');
      } else {
        toast.info('Vérifiez votre téléphone pour valider le paiement');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Impossible d'initier le paiement. Veuillez réessayer.");
    } finally {
      setIsInitiating(false);
    }
  };

  const handleSwitchToCash = async () => {
    try {
      await PaymentService.switchToCash(orderId as string, 'SENDER_PAYS');
      toast.success('Mode de paiement passé en espèces (à la remise)');
      if (orderInfo?.trackingNumber) {
        const rtokenParam = orderInfo.recipientToken ? `&rtoken=${orderInfo.recipientToken}` : '';
        router.push(`/commander/confirmation/${orderInfo.trackingNumber}?token=${orderInfo.senderToken}${rtokenParam}`);
      } else {
        router.push('/');
      }
    } catch (err) {
      toast.error('Erreur lors du changement de mode de paiement');
    }
  };

  if (paymentId && statusData?.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center mb-8"
        >
          <Smartphone className="h-10 w-10 text-fiatlux-primary" />
        </motion.div>

        <h1 className="text-2xl font-black mb-4">En attente de validation</h1>
        <p className="text-neutral-500 mb-4 max-w-xs mx-auto">
          Finalisez le paiement dans l'onglet ouvert, puis revenez ici — la page se met à jour automatiquement.
        </p>
        <button
          onClick={() => {
            if (statusData) return; // évite un double-clic inutile
          }}
          className="text-xs font-bold text-fiatlux-primary underline underline-offset-4 mb-8 flex items-center gap-1.5"
        >
          <ExternalLink className="h-3 w-3" /> L'onglet ne s'est pas ouvert ?
        </button>

        <div className="flex items-center gap-3 bg-neutral-50 px-6 py-4 rounded-2xl border border-neutral-100">
          <Loader2 className="h-5 w-5 animate-spin text-fiatlux-primary" />
          <span className="text-sm font-bold text-neutral-600">Vérification du statut...</span>
        </div>

        <p className="mt-12 text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
          Ne fermez pas cette page
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-50 px-4 h-16 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg">Paiement Mobile Money</h1>
      </header>

      <div className="max-w-md mx-auto px-4 pt-8">
        {/* Order Summary */}
        <Card className="rounded-[40px] border-0 shadow-xl shadow-neutral-200 overflow-hidden mb-8">
          <CardContent className="p-8 bg-neutral-900 text-white">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Montant à régler</p>
                <p className="text-4xl font-black italic">
                  {orderInfo ? `${orderInfo.amount.toLocaleString()} FCFA` : '...'}
                </p>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl">
                <ShieldCheck className="h-6 w-6 text-fiatlux-primary" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {orderInfo?.trackingNumber || '—'}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-3xl flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-3">
              <p className="text-sm font-bold text-red-900 leading-tight">{error}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleInitiatePayment} className="h-8 rounded-lg border-red-200 text-red-700 font-bold text-[10px]">
                  RÉESSAYER
                </Button>
                <Button size="sm" variant="ghost" onClick={handleSwitchToCash} className="h-8 rounded-lg text-red-700 font-bold text-[10px]">
                  PAYER EN ESPÈCES
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-4">
            <Label className="font-bold text-lg ml-1">Choisissez votre opérateur</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setOperator('MTN')}
                className={cn(
                  "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2",
                  operator === 'MTN' ? "border-yellow-400 bg-yellow-50 ring-4 ring-yellow-400/10" : "border-neutral-100 bg-white"
                )}
              >
                <div className="h-10 w-10 bg-yellow-400 rounded-full flex items-center justify-center font-black text-xs">MTN</div>
                <span className="font-black text-xs tracking-tighter">Mobile Money</span>
              </button>
              <button
                onClick={() => setOperator('AIRTEL')}
                className={cn(
                  "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2",
                  operator === 'AIRTEL' ? "border-red-500 bg-red-50 ring-4 ring-red-500/10" : "border-neutral-100 bg-white"
                )}
              >
                <div className="h-10 w-10 bg-red-500 rounded-full flex items-center justify-center font-black text-xs text-white italic">Airtel</div>
                <span className="font-black text-xs tracking-tighter">Airtel Money</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold ml-1">Numéro de téléphone du compte</Label>
            <div className="relative">
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 06 600 00 00"
                className="h-16 rounded-3xl border-2 pl-12 text-xl font-bold"
              />
            </div>
          </div>

          <Button
            onClick={handleInitiatePayment}
            disabled={isInitiating || isPolling || !orderInfo}
            className="w-full h-18 rounded-[30px] text-xl font-black gap-3 shadow-xl shadow-blue-200"
          >
            {isInitiating ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                Payer {orderInfo ? orderInfo.amount.toLocaleString() : '...'} FCFA <ArrowLeft className="h-6 w-6 rotate-180" />
              </>
            )}
          </Button>

          <div className="pt-4 flex flex-col items-center gap-4">
             <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <Lock className="h-3 w-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">SSL Secure</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <ShieldCheck className="h-3 w-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">PCI DSS</span>
                </div>
             </div>

             <button
              onClick={handleSwitchToCash}
              className="flex items-center gap-2 text-neutral-400 hover:text-neutral-600 transition-colors py-2"
             >
                <Wallet className="h-4 w-4" />
                <span className="text-xs font-bold underline underline-offset-4">Changer pour paiement en espèces</span>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}