import { db } from "@/lib/db";
import { requireAuth, errorResponse } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { DisputeStatus, OrderStatus } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const { resolution, forceStatus } = await req.json();

    if (!resolution) {
      return errorResponse('Une description de la résolution est requise', 400);
    }

    const dispute = await db.dispute.findUnique({
      where: { id },
      include: { order: true }
    });

    if (!dispute) {
      return errorResponse('Litige non trouvé', 404);
    }

    if (dispute.status === DisputeStatus.RESOLVED) {
      return errorResponse('Ce litige est déjà résolu', 400);
    }

    // 1. Mettre à jour le litige
    await db.dispute.update({
      where: { id },
      data: {
        status: DisputeStatus.RESOLVED,
        resolution,
        resolvedByUserId: auth.id,
        resolvedAt: new Date(),
      }
    });

    // 2. Si un forçage de statut est demandé
    if (forceStatus) {
      await db.order.update({
        where: { id: dispute.orderId },
        data: {
          status: forceStatus as OrderStatus,
          statusHistory: {
            create: {
              status: forceStatus as OrderStatus,
              note: `RÉSOLUTION MANUELLE PAR L'ADMIN (${auth.email}): ${resolution}`
            }
          }
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Litige résolu avec succès' });

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Dispute resolution error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
