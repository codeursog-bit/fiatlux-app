/**
 * Résout manuellement un litige ouvert par erreur sur une commande précise
 * (faux positif de la détection automatique — voir dispute-detection.ts).
 * Ne touche PAS au statut de la commande, seulement au litige lui-même.
 *
 * Usage :
 *   npx tsx scripts/resolve-dispute.ts <token-ou-numero-de-suivi>
 *
 * Exemple :
 *   npx tsx scripts/resolve-dispute.ts EXP-885377-6183
 *   npx tsx scripts/resolve-dispute.ts 699845b4-e45f-4bd8-8263-a8e86af599f7
 */
import { db } from '../src/lib/db';
import { DisputeStatus } from '@prisma/client';

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: npx tsx scripts/resolve-dispute.ts <token-ou-numero-de-suivi>');
    process.exit(1);
  }

  const trackingLink = await db.trackingLink.findUnique({ where: { token: input } });
  const order = trackingLink
    ? await db.order.findUnique({ where: { id: trackingLink.orderId } })
    : await db.order.findUnique({ where: { trackingNumber: input } });

  if (!order) {
    console.error(`\n❌ Aucune commande trouvée pour "${input}".\n`);
    process.exit(1);
  }

  const openDisputes = await db.dispute.findMany({
    where: { orderId: order.id, status: DisputeStatus.OPEN },
  });

  if (openDisputes.length === 0) {
    console.log(`\n✅ Aucun litige ouvert pour ${order.trackingNumber} — rien à faire.\n`);
    return;
  }

  console.log(`\n${openDisputes.length} litige(s) ouvert(s) trouvé(s) pour ${order.trackingNumber} :`);
  for (const d of openDisputes) {
    console.log(`- [${d.type}] ${d.description}`);
  }

  for (const d of openDisputes) {
    await db.dispute.update({
      where: { id: d.id },
      data: {
        status: DisputeStatus.RESOLVED,
        resolution: "Faux positif : commande 'à soi-même' en mode AUTO, la confirmation livreur à l'étape collecte est volontairement absente par conception (voir skipPickupConfirmation). Résolu manuellement suite au correctif de dispute-detection.ts.",
        resolvedAt: new Date(),
      },
    });
    console.log(`✅ Litige ${d.id} marqué comme résolu.`);
  }

  console.log('');
}

main()
  .catch((e) => {
    console.error('Erreur script:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());