import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        paymentStatus: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            method: true,
            amount: true,
            updatedAt: true,
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 });
    }

    return NextResponse.json({
      paymentStatus: order.paymentStatus,
      lastTransaction: order.transactions[0] || null,
    });

  } catch (error) {
    console.error("Payment status poll error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
