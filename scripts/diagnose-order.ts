/**
 * Script de DIAGNOSTIC (lecture seule, ne modifie rien) pour comprendre
 * pourquoi une commande précise reste bloquée côté client sur "En attente"
 * alors que le chauffeur est arrivé.
 *
 * Usage :
 *   npx tsx scripts/diagnose-order.ts <token-ou-numero-de-suivi>
 *
 * Exemple avec le token de l'URL /suivi/<token> :
 *   npx tsx scripts/diagnose-order.ts 699845b4-e45f-4bd8-8263-a8e86af599f7
 *
 * Ou avec un numéro de suivi (EXP-xxxxxx-xxxx) :
 *   npx tsx scripts/diagnose-order.ts EXP-583486-2988
 *
 * Si tsx n'est pas installé : npx ts-node scripts/diagnose-order.ts <...>
 * (ou installer tsx en une fois : npm install -D tsx)
 */
import { db } from '../src/lib/db';

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: npx tsx scripts/diagnose-order.ts <token-ou-numero-de-suivi>');
    process.exit(1);
  }

  // On accepte soit un token de suivi (celui qui apparaît dans /suivi/<token>),
  // soit directement un numéro de commande (EXP-xxxxxx-xxxx).
  const trackingLink = await db.trackingLink.findUnique({
    where: { token: input },
    include: { order: true },
  });

  const order = trackingLink
    ? trackingLink.order
    : await db.order.findUnique({ where: { trackingNumber: input } });

  if (!order) {
    console.error(`\n❌ Aucune commande trouvée pour "${input}".`);
    console.error('   Vérifiez le token (dans /suivi/<token>) ou le numéro EXP-xxxxxx-xxxx.\n');
    process.exit(1);
  }

  const allLinks = await db.trackingLink.findMany({ where: { orderId: order.id } });
  const confirmations = await db.confirmation.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: 'asc' },
  });
  const statusHistory = await db.orderStatusHistory.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: 'asc' },
  });

  console.log('\n========== COMMANDE ==========');
  console.log('ID                 :', order.id);
  console.log('Numéro de suivi    :', order.trackingNumber);
  console.log('Statut actuel      :', order.status);
  console.log('Type de livraison  :', order.deliveryType, order.deliveryType === 'THIRD_PARTY' ? '(2 liens attendus : expéditeur + destinataire)' : '(1 seul lien attendu, valable pour toute la course)');
  console.log('Mode contrôle coll.:', order.pickupControlMode ?? '(non applicable)');
  console.log('Paiement           :', order.paymentMethod, '-', order.paymentStatus);

  console.log('\n========== LIENS DE SUIVI (trackingLink) ==========');
  if (allLinks.length === 0) {
    console.log('⚠️  Aucun lien de suivi trouvé pour cette commande — anomalie.');
  }
  for (const link of allLinks) {
    const isTheOneShown = trackingLink && link.token === trackingLink.token;
    console.log(`- rôle=${link.role}  token=${link.token}${isTheOneShown ? '   <== celui de la capture d\'écran' : ''}`);
    console.log(`  URL: /suivi/${link.token}`);
  }

  console.log('\n========== HISTORIQUE DE STATUT (order.status au fil du temps) ==========');
  if (statusHistory.length === 0) {
    console.log('⚠️  Aucun historique de statut enregistré — anomalie.');
  }
  for (const h of statusHistory) {
    console.log(`- ${h.createdAt.toISOString()}  →  ${h.status}${h.note ? '  (' + h.note + ')' : ''}`);
  }

  console.log('\n========== CONFIRMATIONS (colis remis / reçu / espèces) ==========');
  if (confirmations.length === 0) {
    console.log('⚠️  AUCUNE confirmation enregistrée — c\'est probablement la cause du blocage :');
    console.log('    la commande est arrivée à AT_DROPOFF, mais personne n\'a encore cliqué');
    console.log('    "J\'ai reçu le colis" via le lien destinataire.');
  }
  for (const c of confirmations) {
    console.log(`- ${c.createdAt.toISOString()}  étape=${c.step}  acteur=${c.actor}  action=${c.action}`);
  }

  console.log('\n========== DIAGNOSTIC ==========');
  if (trackingLink) {
    const shownRole = trackingLink.role;
    if (order.deliveryType === 'THIRD_PARTY' && shownRole === 'SENDER' && order.status === 'AT_DROPOFF') {
      const recipientLink = allLinks.find((l) => l.role === 'RECIPIENT');
      console.log('👉 Cette capture montre le lien EXPÉDITEUR. Pour une livraison à un tiers,');
      console.log('   c\'est le lien DESTINATAIRE qui permet de confirmer la réception.');
      if (recipientLink) {
        console.log(`   Lien destinataire à utiliser : /suivi/${recipientLink.token}`);
      } else {
        console.log('   ⚠️ Aucun lien destinataire trouvé en base — anomalie à investiguer séparément.');
      }
    } else if (order.deliveryType === 'SELF' && confirmations.length === 0 && order.status === 'AT_DROPOFF') {
      console.log('👉 Livraison à soi-même, chauffeur arrivé, mais aucune confirmation enregistrée.');
      console.log('   Avec le correctif déployé, ce même lien devrait maintenant afficher');
      console.log('   la carte "J\'ai reçu le colis" — rechargez la page (Ctrl+F5) pour vérifier');
      console.log('   que le navigateur n\'a pas gardé une ancienne version en cache.');
    } else if (order.status !== 'AT_DROPOFF') {
      console.log(`👉 Le statut de la commande est "${order.status}", pas encore AT_DROPOFF.`);
      console.log('   La bannière "à 0m de la livraison" ne reflète que la position GPS en');
      console.log('   direct, pas le statut officiel — voir order-state-machine.ts.');
    } else {
      console.log('👉 Rôle et statut cohérents ; si ça reste bloqué, il faut regarder le rendu');
      console.log('   de suivi/[token]/page.tsx pour ce cas précis.');
    }
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error('Erreur script:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());