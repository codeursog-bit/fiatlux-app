import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook pour les confirmations de paiement Mobile Money réelles
 * (MTN Money, Airtel Money)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. TODO: Vérifier la signature/IP du fournisseur pour la sécurité
    // const signature = req.headers.get("x-callback-signature");
    
    const body = await req.json();
    console.log("[Webhook] Mobile Money callback received:", body);

    // 2. Extraire la référence et le statut
    // La structure dépendra du fournisseur choisi (Aggregateur ou Direct)
    const { externalReference, status } = body; 

    if (!externalReference) {
      return NextResponse.json({ error: "No reference" }, { status: 400 });
    }

    const transaction = await db.paymentTransaction.findFirst({
      where: { externalReference }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // 3. Mettre à jour si succès
    if (status === "SUCCESSFUL" || status === "COMPLETED") {
      await db.$transaction([
        db.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: "CONFIRMED" },
        }),
        db.order.update({
          where: { id: transaction.orderId },
          data: { paymentStatus: "PAID" },
        }),
      ]);
    } else if (status === "FAILED") {
      await db.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED" },
      });
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
