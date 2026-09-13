/**
 * Normalise un numéro de téléphone pour un stockage/comparaison cohérents,
 * indépendamment de la façon dont il a été saisi (espaces, tirets, indicatif
 * +242 ou 242 en préfixe...).
 *
 * Exemples qui doivent tous produire le même résultat "066000000" :
 *   "06 600 00 00", "066000000", "+242 06 600 00 00", "242066000000"
 *
 * Sans cette normalisation, un chauffeur créé avec "06 600 00 00" par
 * l'admin ne peut pas se connecter en tapant "066000000" — le champ
 * `phone` est comparé en exact match (`findUnique`) et les deux chaînes
 * diffèrent uniquement par les espaces.
 */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';

  // Ne garde que les chiffres (retire espaces, tirets, points, +...).
  let digits = raw.replace(/\D/g, '');

  // Retire l'indicatif Congo-Brazzaville (242) s'il est présent en préfixe
  // d'un numéro plus long que le format local à 9 chiffres.
  if (digits.startsWith('242') && digits.length > 9) {
    digits = digits.slice(3);
  }

  // Réintroduit le 0 initial du format local s'il a été omis
  // (ex: "66000000" saisi sans le premier zéro).
  if (digits.length === 8 && !digits.startsWith('0')) {
    digits = '0' + digits;
  }

  return digits;
}