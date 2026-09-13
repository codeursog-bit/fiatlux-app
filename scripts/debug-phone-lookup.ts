/**
 * Diagnostic en lecture seule : affiche tout ce qui est stocké pour un
 * numéro donné, sans filtre de normalisation ni d'expiration, pour voir
 * exactement pourquoi une recherche échoue.
 *
 * Usage : npx tsx scripts/debug-phone-lookup.ts 064133693
 */
import { PrismaClient } from '@prisma/client';
import { normalizePhone } from '../src/lib/phone';

const prisma = new PrismaClient();

async function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error('Usage: npx tsx scripts/debug-phone-lookup.ts <numero>');
    process.exit(1);
  }

  const normalized = normalizePhone(raw);
  console.log(`Numéro tapé   : "${raw}"`);
  console.log(`Normalisé en  : "${normalized}"\n`);

  // On cherche large (contient les derniers chiffres), pas de filtre
  // d'expiration ni de normalisation exacte, pour voir tout ce qui existe.
  const suffix = normalized.slice(-7);
  const links = await prisma.trackingLink.findMany({
    where: { phone: { contains: suffix } },
    include: { order: { select: { trackingNumber: true, status: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
  });

  if (links.length === 0) {
    console.log(`Aucun lien de suivi ne contient la séquence "${suffix}" — le numéro n'a jamais été enregistré tel quel.`);
    return;
  }

  const now = new Date();
  for (const link of links) {
    const expired = link.expiresAt < now;
    const matchesNormalized = link.phone === normalized;
    console.log(
      `- Commande ${link.order.trackingNumber} | rôle ${link.role} | ` +
      `phone stocké="${link.phone}" (${matchesNormalized ? 'MATCH exact avec le numéro normalisé' : 'NE MATCHE PAS le numéro normalisé'}) | ` +
      `expire le ${link.expiresAt.toISOString()} (${expired ? 'EXPIRÉ' : 'actif'}) | ` +
      `statut commande: ${link.order.status}`
    );
  }
}

main()
  .catch((err) => {
    console.error('Erreur:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());