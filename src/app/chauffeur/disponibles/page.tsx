'use client';

import * as React from 'react';
import { Loader2, MapPin, Package, AlertCircle, Clock, CheckCircle2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ChauffeurLayout } from '@/components/layout/chauffeur-layout';
import { useAvailableOrders, useClaimOrder, useMyOrders } from '@/hooks/use-rider-portal';
import { Button } from '@/components/ui/button';

export default function ChauffeurDisponiblesPage() {
  const { data: orders, isLoading } = useAvailableOrders();
  const { data: myActiveOrders } = useMyOrders();
  const claimOrder = useClaimOrder();
  const [claimingId, setClaimingId] = React.useState<string | null>(null);

  const hasActiveOrder = (myActiveOrders?.length ?? 0) > 0;

  const handleClaim = async (id: string) => {
    setClaimingId(id);
    try {
      await claimOrder.mutateAsync(id);
      toast.success('Demande envoyée — un admin va la valider.');
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erreur lors de la demande';
      toast.error(message);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <ChauffeurLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-black text-slate-900">Commandes disponibles</h1>
          <p className="text-xs text-slate-500 font-medium">Demandez une course — un admin valide avant de vous l&apos;assigner</p>
        </div>

        {hasActiveOrder && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 font-medium">
              Terminez votre course en cours avant d'en demander une nouvelle.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-fiatlux-primary" />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-medium">Aucune commande disponible pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order: any) => {
              const alreadyRequested = order.myClaimStatus === 'PENDING';
              return (
                <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-slate-500">{order.trackingNumber}</span>
                    <span className="text-sm font-black text-fiatlux-primary">{order.amount?.toLocaleString()} FCFA</span>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-start gap-1.5 text-xs text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{order.pickupZone || order.pickupAddress}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-xs text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-fiatlux-primary shrink-0 mt-0.5" />
                      <span>{order.dropoffZone || order.dropoffAddress}</span>
                    </div>
                  </div>
                  {order.packageDescription && (
                    <p className="text-[11px] text-slate-400 italic mb-3">{order.packageDescription}</p>
                  )}
                  {order.interestedRidersCount > 0 && !alreadyRequested && (
                    <p className="text-[10px] text-slate-400 font-medium mb-2 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {order.interestedRidersCount} autre{order.interestedRidersCount > 1 ? 's' : ''} chauffeur{order.interestedRidersCount > 1 ? 's' : ''} intéressé{order.interestedRidersCount > 1 ? 's' : ''}
                    </p>
                  )}
                  {alreadyRequested ? (
                    <div className="w-full h-11 flex items-center justify-center gap-2 bg-amber-50 text-amber-700 rounded-md font-black uppercase tracking-wider text-xs">
                      <Clock className="w-4 h-4" /> Demande envoyée
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleClaim(order.id)}
                      disabled={hasActiveOrder || claimingId === order.id}
                      className="w-full h-11 bg-fiatlux-primary hover:bg-[#0d4270] text-white font-black uppercase tracking-wider text-xs"
                    >
                      {claimingId === order.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Je m'en charge"
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ChauffeurLayout>
  );
}
