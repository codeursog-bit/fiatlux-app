import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const { trackingNumber } = await params;

    const order = await db.order.findUnique({
      where: { trackingNumber },
      select: {
        trackingNumber: true,
        status: true,
        packageDescription: true,
        amount: true,
        quotedManually: true,
        paymentMethod: true,
        createdAt: true,
        pickupAddress: true,
        dropoffAddress: true,
        // On ne renvoie pas les noms/téléphones complets pour la confidentialité publique
        // juste les adresses et le statut
        guestCustomerName: true,
        recipientName: true,
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 });
    }

    // Masquage partiel des noms pour la confidentialité
    const maskName = (name: string | null) => {
      if (!name) return "Client";
      const parts = name.split(" ");
      if (parts.length === 1) return name[0] + "***";
      return parts[0] + " " + parts[parts.length - 1][0] + ".";
    };

    return NextResponse.json({
      ...order,
      guestCustomerName: maskName(order.guestCustomerName),
      recipientName: maskName(order.recipientName),
    });

  } catch (error) {
    console.error("Order fetch error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
