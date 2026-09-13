import { db } from "@/lib/db";
import { requireAuth, errorResponse } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, { role: 'partner' });

    const orders = await db.order.findMany({
      where: { partnerId: auth.partnerId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Partner orders GET error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, { role: 'partner' });
    const data = await req.json();

    // Logic similar to public order creation but with partnerId
    const trackingNumber = `EXP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const order = await db.order.create({
      data: {
        ...data,
        trackingNumber,
        partnerId: auth.partnerId,
        status: OrderStatus.PENDING,
        statusHistory: {
          create: {
            status: OrderStatus.PENDING,
            note: "Commande créée via l'espace partenaire"
          }
        }
      }
    });

    return NextResponse.json(order);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Partner order POST error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
