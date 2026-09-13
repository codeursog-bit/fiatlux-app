/**
 * Service d'intégration Mobile Money (Abstrait)
 * Branchement futur: MTN Money API, Airtel Money API
 */

export enum MobileMoneyProvider {
  MTN = "MTN",
  AIRTEL = "AIRTEL",
}

export interface PaymentInitiationResult {
  success: boolean;
  externalReference: string;
  message?: string;
}

export async function initiateMobileMoneyPayment(
  provider: MobileMoneyProvider,
  phone: string,
  amount: number,
  orderId: string
): Promise<PaymentInitiationResult> {
  console.log(`[MobileMoney] Initiating ${provider} payment for Order ${orderId} | Phone: ${phone} | Amount: ${amount}`);

  // TODO: Appel API réelle ici
  // Exemple MTN: POST https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay
  // Exemple Airtel: POST https://openapi.airtel.africa/v1/payments/
  
  // Simulation de succès immédiat du lancement
  const externalReference = `MM-${Math.random().toString(36).substring(7).toUpperCase()}`;
  
  return {
    success: true,
    externalReference,
    message: "Demande de paiement envoyée au téléphone",
  };
}

/**
 * Simule le passage en CONFIRMED après quelques secondes
 * Dans la réalité, cela viendrait d'un Webhook ou d'un polling vers le fournisseur
 */
export async function simulatePaymentConfirmation(orderId: string, transactionId: string) {
  // On ne bloque pas l'exécution principale, on lance ça en "fond"
  setTimeout(async () => {
    try {
      const { db } = await import("./db");
      
      await db.$transaction([
        db.paymentTransaction.update({
          where: { id: transactionId },
          data: { status: "CONFIRMED" },
        }),
        db.order.update({
          where: { id: orderId },
          data: { paymentStatus: "PAID" },
        }),
      ]);
      
      console.log(`[MobileMoney] Transaction ${transactionId} confirmed automatically (Simulation)`);
    } catch (error) {
      console.error("[MobileMoney] Error in simulation:", error);
    }
  }, 5000);
}
