/**
 * Renormalise les TrackingLink.phone déjà en base, créés avant le fix de
 * normalisation (voir src/lib/phone.ts). À lancer une seule fois.
 *
 * Usage : npx tsx scripts/backfill-tracking-phone.ts
 */
import { PrismaClient } from '@prisma/client';
import { normalizePhone } from '../src/lib/phone';

const prisma = new PrismaClient();

async function main() {
  const links = await prisma.trackingLink.findMany({ select: { id: true, phone: true } });
  let updated = 0;

  for (const link of links) {
    const normalized = normalizePhone(link.phone);
    if (normalized !== link.phone) {
      await prisma.trackingLink.update({ where: { id: link.id }, data: { phone: normalized } });
      updated++;
    }
  }

  console.log(`${updated} numéro(s) renormalisé(s) sur ${links.length} lien(s) de suivi.`);
}

main()
  .catch((err) => {
    console.error('Erreur:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());