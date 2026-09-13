import { db } from "@/lib/db";
import { requireAuth, errorResponse } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { PartnerStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, { role: 'admin' });
    const { id } = await params;

    const partner = await db.partner.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    if (!partner) {
      return errorResponse('Partner not found', 404);
    }

    // Traçabilité admin : toutes les commandes de ce partenaire, les plus
    // récentes en premier. Pas de pagination pour l'instant (volumes encore
    // faibles) — à revoir si un partenaire dépasse plusieurs centaines de
    // commandes.
    const orders = await db.order.findMany({
      where: { partnerId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        trackingNumber: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        amount: true,
        pickupAddress: true,
        dropoffAddress: true,
        recipientName: true,
        recipientPhone: true,
        packageDescription: true,
        deliveryType: true,
        cancelReason: true,
        failureReason: true,
        createdAt: true,
        updatedAt: true,
        rider: {
          select: { id: true, name: true, phone: true }
        },
      },
    });

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
    const cancelledOrCount = orders.filter(o => o.status === 'CANCELLED' || o.status === 'FAILED').length;
    const activeCount = totalOrders - deliveredOrders.length - cancelledOrCount;
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.amount, 0);
    const lastOrderAt = orders[0]?.createdAt ?? null;

    return NextResponse.json({
      partner,
      stats: {
        totalOrders,
        deliveredCount: deliveredOrders.length,
        cancelledCount: cancelledOrCount,
        activeCount,
        totalRevenue,
        lastOrderAt,
      },
      orders,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Admin partner GET error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, { role: 'admin' });
    const { id } = await params;
    const body = await req.json();
    const { companyName, contactName, email, phone, status, password } = body;

    const existingPartner = await db.partner.findUnique({ where: { id } });
    if (!existingPartner) {
      return errorResponse('Partner not found', 404);
    }

    if (status && !['ACTIVE', 'SUSPENDED'].includes(status)) {
      return errorResponse('Invalid status', 400);
    }

    if (email && email !== existingPartner.email) {
      const emailTaken = await db.partner.findUnique({ where: { email } });
      if (emailTaken) {
        return errorResponse('Un partenaire utilise déjà cet email', 400);
      }
    }

    const data: Record<string, any> = {};
    if (companyName !== undefined) data.companyName = companyName;
    if (contactName !== undefined) data.contactName = contactName;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (status !== undefined) data.status = status as PartnerStatus;
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const partner = await db.partner.update({
      where: { id },
      data,
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(partner);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Admin partner PATCH error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, { role: 'admin' });
    const { id } = await params;

    const partner = await db.partner.findUnique({ where: { id } });
    if (!partner) {
      return errorResponse('Partner not found', 404);
    }

    // Garde-fou traçabilité : on ne supprime jamais un partenaire qui a de
    // l'historique (commandes). Le supprimer casserait la trace de qui a
    // passé ces commandes (partnerId passerait à null dessus). Dans ce cas,
    // on force le passage par la suspension (PATCH status=SUSPENDED) plutôt
    // qu'une suppression définitive.
    const orderCount = await db.order.count({ where: { partnerId: id } });
    if (orderCount > 0) {
      return errorResponse(
        `Impossible de supprimer ce partenaire : il a ${orderCount} commande(s) enregistrée(s). Suspendez son compte à la place pour couper son accès tout en gardant l'historique.`,
        409
      );
    }

    await db.partner.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Admin partner DELETE error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}