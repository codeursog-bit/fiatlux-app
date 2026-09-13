'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Copy, 
  Share2, 
  Bike, 
  Clock, 
  ArrowRight,
  Package,
  Phone,
  MapPin,
  CreditCard,
  Wallet,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PublicOrderService } from '@/services/public-order.service';

export default function ConfirmationPage() {
  const { trackingNumber } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Le token de suivi de l'expéditeur transite par l'URL depuis la
  // création de commande / le paiement — jamais renvoyé par cette API
  // publique keyed par trackingNumber (trop devinable pour porter un
  // token sensible).
  const senderToken = searchParams.get('token');
  // Présent uniquement pour une livraison à un tiers (voir
  // /api/public/orders) — le SMS n'étant pas fiable à 100%, on donne à la
  // personne qui crée la commande un lien qu'elle peut copier/partager
  // elle-même (WhatsApp, etc.) avec le destinataire.
  const recipientToken = searchParams.get('rtoken');

  const { data: order, isLoading } = useQuery({
    queryKey: ['public-order', trackingNumber],
    queryFn: () => PublicOrderService.getPublicOrder(trackingNumber as string),
    enabled: !!trackingNumber,
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(trackingNumber as string);
    toast.success('Numéro de suivi copié !');
  };

  const copyLink = (path: string, label: string) => {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url);
    toast.success(`${label} copié !`);
  };

  const maskPhone = (phone?: string) => {
    if (!phone) return '...';
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length < 4) return phone;
    return `${cleaned.slice(0, 4)} *** ** ${cleaned.slice(-2)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-fiatlux-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-black mb-2">Commande introuvable</h1>
        <p className="text-neutral-500 mb-6">Nous n'avons pas pu charger les détails de votre commande.</p>
        <Button onClick={() => router.push('/')}>Retour à l'accueil</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-12 flex flex-col items-center pb-24">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center">
          <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-emerald-50">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>

          <h1 className="text-3xl font-black text-neutral-900 tracking-tight mb-2">Commande confirmée</h1>
          <p className="text-neutral-500 font-medium mb-10">
            Votre demande a été enregistrée avec succès.
          </p>
        </div>

        {/* Tracking Code Card */}
        <Card className="rounded-[40px] border-0 shadow-2xl shadow-neutral-200 overflow-hidden mb-8">
          <CardContent className="p-8">
            <p className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2 text-center">Numéro de suivi</p>
            <div className="flex items-center justify-center gap-3 bg-neutral-50 p-4 rounded-2xl mb-8">
              <span className="text-2xl font-mono font-black text-fiatlux-primary tracking-tighter">{order.trackingNumber}</span>
              <Button variant="ghost" size="icon" onClick={copyToClipboard} className="h-10 w-10 text-neutral-400 hover:text-fiatlux-primary">
                <Copy className="h-5 w-5" />
              </Button>
            </div>

            {/* Summary List */}
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="bg-neutral-100 p-2 rounded-xl">
                  <Package className="h-4 w-4 text-neutral-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-0.5">Colis</p>
                  <p className="text-sm font-bold text-neutral-900">{order.packageDescription}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-neutral-100 p-2 rounded-xl">
                  <MapPin className="h-4 w-4 text-neutral-500" />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-0.5">Collecte</p>
                    <p className="text-sm font-bold text-neutral-900 line-clamp-1">{order.pickupAddress}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-0.5">Livraison</p>
                    <p className="text-sm font-bold text-neutral-900 line-clamp-1">{order.dropoffAddress}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-dashed">
                <div className="flex items-center gap-3">
                  <div className="bg-neutral-100 p-2 rounded-xl">
                    {order.paymentMethod === 'ONLINE' ? <CreditCard className="h-4 w-4 text-neutral-500" /> : <Wallet className="h-4 w-4 text-neutral-500" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Paiement</p>
                    <p className="text-xs font-bold text-neutral-900">{order.paymentMethod === 'ONLINE' ? 'Mobile Money' : 'Espèces'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-neutral-900 italic text-lg">
                    {order.quotedManually ? 'Sur devis' : `${order.amount.toLocaleString()} FCFA`}
                  </p>
                </div>
              </div>
            </div>

            {senderToken ? (
              <Link href={`/suivi/${senderToken}`} className="block">
                <Button className="w-full h-16 rounded-2xl text-lg font-black gap-2 shadow-xl shadow-blue-100">
                  {recipientToken ? 'Suivre la collecte' : 'Suivre ma commande'} <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <div className="text-center text-xs text-neutral-400 font-medium py-2">
                Utilisez le lien reçu par SMS pour suivre votre commande.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lien à partager avec le destinataire (livraison à un tiers) */}
        {recipientToken && (
          <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 mb-8">
            <div className="flex items-start gap-4 mb-4">
              <Share2 className="h-6 w-6 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-black text-neutral-900 mb-1">À transmettre au destinataire</p>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Ce lien lui permet de suivre la livraison et de confirmer la réception du colis.
                  Le SMS automatique n'étant pas toujours fiable, partagez-le vous-même (WhatsApp, etc.) pour être sûr qu'il l'ait bien reçu.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl font-bold gap-2 bg-white"
              onClick={() => copyLink(`/suivi/${recipientToken}`, 'Lien destinataire')}
            >
              <Copy className="h-4 w-4" /> Copier le lien du destinataire
            </Button>
          </div>
        )}

        {/* SMS Reminder */}
        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 mb-8 flex items-start gap-4">
          <Phone className="h-6 w-6 text-fiatlux-primary shrink-0" />
          <div>
            <p className="text-sm font-black text-neutral-900 mb-1">Notifications</p>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {recipientToken
                ? "Un SMS a été envoyé à chacun avec son propre lien de suivi — pensez tout de même à transmettre le lien ci-dessus au destinataire en secours."
                : 'Un SMS avec le lien de suivi vous a été envoyé. Ce même lien suit toute la course, de la collecte à la livraison.'}
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-fiatlux-primary transition-colors">
            Retourner à l'accueil
          </Link>
        </div>
      </motion.div>

      <footer className="mt-12 text-center opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">
          FIATLUX LOGISTICS ENGINE v2
        </p>
      </footer>
    </div>
  );
}