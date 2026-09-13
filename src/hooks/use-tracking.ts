'use client';

import { useQuery } from '@tanstack/react-query';
import { PublicOrderService } from '@/services/public-order.service';

/**
 * Récupère les infos de suivi d'une commande via son token public
 * (page /suivi/[token]). Rafraîchit automatiquement tant que la
 * livraison n'est pas terminée, pour suivre le chauffeur en direct.
 *
 * Important : sans refetchIntervalInBackground / refetchOnWindowFocus /
 * refetchOnReconnect, react-query met le polling en pause dès que l'onglet
 * passe en arrière-plan (téléphone verrouillé pendant qu'on attend le
 * livreur) et ne rattrape pas au retour — le client voit alors un statut
 * périmé ("En attente") même longtemps après que le chauffeur a validé
 * l'étape suivante côté appli. Ces 3 options comblent ce trou.
 */
export function useTracking(token: string) {
  return useQuery({
    queryKey: ['tracking', token],
    queryFn: () => PublicOrderService.getByToken(token),
    enabled: !!token,
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.order?.status;
      return status && !['DELIVERED', 'CANCELLED'].includes(status) ? 8_000 : false;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}