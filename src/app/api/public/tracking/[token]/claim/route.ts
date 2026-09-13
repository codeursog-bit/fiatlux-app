import { NextRequest, NextResponse } from "next/server";
import { resolveTrackingToken } from "@/lib/tracking-auth";
import { db } from "@/lib/db";
import { OrderStatus, DisputeType, DisputeStatus } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { description, photoUrl } = await req.json();

    if (!description) {
      return NextResponse.json({ error: "Description requise" }, { status: 400 });
    }

    const result = await resolveTrackingToken(token);
    if (!result) {
      return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 404 });
    }

    const { order } = result;

    // Vérifier si la commande est livrée depuis moins de 48h
    if (order.status !== OrderStatus.DELIVERED) {
      return NextResponse.json({ error: "Réclamation possible uniquement après livraison" }, { status: 400 });
    }

    // Récupérer la date de livraison réelle dans l'historique
    const deliveryRecord = await db.orderStatusHistory.findFirst({
      where: {
        orderId: order.id,
        status: OrderStatus.DELIVERED
      },
      orderBy: { createdAt: 'desc' }
    });

    if (deliveryRecord) {
      const deliveryDate = new Date(deliveryRecord.createdAt);
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      if (deliveryDate < fortyEightHoursAgo) {
        return NextResponse.json({ error: "Délai de réclamation de 48h dépassé" }, { status: 400 });
      }
    }

    // Créer le litige
    const dispute = await db.dispute.create({
      data: {
        orderId: order.id,
        type: DisputeType.POST_DELIVERY_CLAIM,
        description: description + (photoUrl ? `\nPhoto: ${photoUrl}` : ""),
        status: DisputeStatus.OPEN
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Votre réclamation a été enregistrée. Notre équipe va l'étudier.",
      disputeId: dispute.id 
    });

  } catch (error) {
    console.error("Public claim API error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
