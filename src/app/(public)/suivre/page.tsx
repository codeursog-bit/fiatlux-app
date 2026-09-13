'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Phone, 
  Hash, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Package,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  ASSIGNED: 'Chauffeur assigné',
  ACCEPTED: 'Acceptée',
  EN_ROUTE_TO_PICKUP: 'Chauffeur en route',
  AT_PICKUP: 'Chauffeur à la collecte',
  PICKED_UP: 'Colis récupéré',
  IN_TRANSIT: 'En livraison',
  AT_DROPOFF: 'Chauffeur à destination',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
  FAILED: 'Échouée',
};

export default function SuivrePage() {
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<'phone' | 'order'>('phone');
  const [phone, setPhone] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setOrders(null);

    try {
      const response = await fetch('/api/public/tracking/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          trackingNumber: searchMode === 'order' ? orderNumber : undefined
        }),
      });

      const data = await response.json();

      if (response.ok && data.orders?.length === 1) {
        // Un seul résultat : on va directement au suivi, pas besoin de faire
        // choisir dans une liste d'un seul élément.
        router.push(`/suivi/${data.orders[0].token}`);
      } else if (response.ok && data.orders?.length > 1) {
        // Plusieurs commandes actives pour ce numéro : on les liste, la
        // personne choisit laquelle suivre.
        setOrders(data.orders);
      } else {
        setError(data.error || "Aucune commande trouvée avec ces informations.");
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-20 h-20 bg-fiatlux-primary/10 rounded-[32px] flex items-center justify-center mx-auto mb-6">
            <Search className="h-10 w-10 text-fiatlux-primary" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Retrouver ma commande</h1>
          <p className="text-slate-500 font-medium">
            Lien de suivi perdu ? Retrouvez votre colis en quelques secondes.
          </p>
        </motion.div>

        <Card className="rounded-[40px] border-0 shadow-2xl shadow-slate-200/40 overflow-hidden bg-white">
          <CardContent className="p-8">
            <div className="flex p-1 bg-slate-50 rounded-2xl mb-8">
              <button
                onClick={() => setSearchMode('phone')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  searchMode === 'phone' ? 'bg-white text-fiatlux-primary shadow-sm' : 'text-slate-400'
                }`}
              >
                Par téléphone
              </button>
              <button
                onClick={() => setSearchMode('order')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  searchMode === 'order' ? 'bg-white text-fiatlux-primary shadow-sm' : 'text-slate-400'
                }`}
              >
                Par N° de commande
              </button>
            </div>

            <form onSubmit={handleSearch} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Votre numéro de téléphone
                </Label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-fiatlux-primary transition-colors" />
                  <Input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06 000 00 00"
                    className="h-14 pl-12 rounded-2xl border-slate-100 focus:border-fiatlux-primary text-base font-bold transition-all"
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {searchMode === 'order' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      Numéro de commande
                    </Label>
                    <div className="relative group">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-fiatlux-primary transition-colors" />
                      <Input
                        required={searchMode === 'order'}
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="EXP-XXXXXX"
                        className="h-14 pl-12 rounded-2xl border-slate-100 focus:border-fiatlux-primary text-base font-bold transition-all uppercase"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3"
                >
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-red-700">{error}</p>
                    <Link href="/aide" className="text-xs font-bold text-red-400 hover:underline inline-flex items-center gap-1">
                      Besoin d'aide ? <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !phone}
                className="w-full h-16 rounded-2xl bg-fiatlux-primary hover:bg-fiatlux-primary/90 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Rechercher <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {orders && orders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-3"
          >
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
              {orders.length} commande{orders.length > 1 ? 's' : ''} trouvée{orders.length > 1 ? 's' : ''}
            </p>
            {orders.map((o) => (
              <Link
                key={o.token}
                href={`/suivi/${o.token}`}
                className="block bg-white rounded-3xl border border-slate-100 shadow-sm p-5 hover:border-fiatlux-primary/40 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-800">{o.trackingNumber}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-fiatlux-primary bg-fiatlux-primary/10 px-2.5 py-1 rounded-full">
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{o.pickupAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Package className="h-3.5 w-3.5 text-fiatlux-primary shrink-0" />
                    <span className="truncate">{o.dropoffAddress}</span>
                  </div>
                </div>
              </Link>
            ))}
          </motion.div>
        )}

        <div className="mt-8 text-center">
          <Link 
            href="/aide" 
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-fiatlux-primary transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            Vous ne trouvez pas vos informations ?
          </Link>
        </div>
      </div>
    </div>
  );
}