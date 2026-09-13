/**
 * Service d'envoi de SMS (Abstrait)
 * TODO: Brancher un fournisseur SMS local (ex: Chikka, Infobip, ou passerelle locale)
 */
export async function sendSms(phone: string, message: string) {
  console.log(`[SMS] To: ${phone} | Content: ${message}`);
  
  // Simulation de délai réseau
  return new Promise((resolve) => setTimeout(resolve, 100));
}
