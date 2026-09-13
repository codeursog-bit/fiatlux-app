import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { PaymentTransactionStatus } from "@prisma/client";
import { isRateLimited } from "@/lib/rate-limit";
import { initiateMotekiCheckout, MobileMoneyOperator } from "@/lib/moteki";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (isRateLimited(`payment-init-${ip}`, 3, 60000)) {
      return NextResponse.json({ error: "Trop de tentatives de paiement. Veuillez patienter une minute." }, { status: 429 });
    }

    const { orderId, operator, phone } = await req.json();

    if (!orderId || !operator || !phone) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    if (operator !== "MTN" && operator !== "AIRTEL") {
      return NextResponse.json({ error: "Opérateur invalide" }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, amount: true, paymentStatus: true, guestCustomerName: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 });
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ error: "Commande déjà payée" }, { status: 400 });
    }

    // Correspondance montant -> produit Moteki (nos tarifs sont fixes,
    // donc un montant donné correspond toujours au même produit).
    const motekiProduct = await db.motekiProduct.findUnique({ where: { amount: order.amount } });

    if (!motekiProduct) {
      console.error(`Aucun produit Moteki configuré pour le montant ${order.amount} FCFA`);
      return NextResponse.json(
        { error: "Paiement en ligne indisponible pour ce montant. Réessayez en espèces." },
        { status: 422 }
      );
    }

    const [firstName, ...rest] = (order.guestCustomerName || "Client FiatLux").split(" ");

    const checkout = await initiateMotekiCheckout({
      productUuid: motekiProduct.productUuid,
      customerFirstName: firstName,
      customerLastName: rest.join(" ") || undefined,
      customerPhone: phone,
      operator: operator as MobileMoneyOperator,
      notes: `Commande FiatLux ${order.id}`,
    });

    const transaction = await db.paymentTransaction.create({
      data: {
        orderId: order.id,
        method: operator === "MTN" ? "ONLINE_MTN" : "ONLINE_AIRTEL",
        amount: order.amount,
        status: PaymentTransactionStatus.PENDING,
        externalReference: checkout.orderNumber,
      },
    });

    return NextResponse.json({
      paymentId: transaction.id,
      status: "PENDING",
      redirectUrl: checkout.redirectUrl,
    });
  } catch (error: any) {
    console.error("Payment initiation error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
