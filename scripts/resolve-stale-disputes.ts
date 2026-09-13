/**
 * Referme les litiges "mismatch" restés ouverts alors que la commande
 * concernée s'est en fait terminée normalement (livrée/annulée) — même
 * logique d'auto-résolution que le fix appliqué à la route de transition de
 * statut, mais appliquée rétroactivement aux litiges déjà en base.
 *
 * Usage : npx tsx scripts/resolve-stale-disputes.ts
 */
import { PrismaClient, DisputeStatus, DisputeType, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const openDisputes = await prisma.dispute.findMany({
    where: {
      status: DisputeStatus.OPEN,
      type: { in: [DisputeType.PICKUP_MISMATCH, DisputeType.DROPOFF_MISMATCH] },
      order: { status: { in: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] } },
    },
    include: { order: { select: { trackingNumber: true, status: true } } },
  });

  console.log(`${openDisputes.length} litige(s) orphelin(s) trouvé(s) sur des commandes déjà terminées.`);

  for (const dispute of openDisputes) {
    await prisma.dispute.update({
      where: { id: dispute.id },
      data: {
        status: DisputeStatus.RESOLVED,
        resolution: 'Résolu rétroactivement — la commande a fini par se terminer normalement.',
        resolvedAt: new Date(),
      },
    });
    console.log(`- Refermé : ${dispute.order.trackingNumber} (${dispute.type})`);
  }
}

main()
  .catch((err) => {
    console.error('Erreur:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());