import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { validateTransition } from '@/lib/order-state-machine';
import { OrderStatus, OtpType, PaymentStatus, PaymentMethod } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id: orderId } = await params;
    const { type, code } = await req.json();

    if (!type || !code) {
      return errorResponse('Type et code requis', 400);
    }

    const otp = await db.otpCode.findFirst({
      where: {
        orderId,
        type: type as OtpType,
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return errorResponse('Aucun code OTP actif trouvé pour ce type', 400);
    }

    // Check if blocked due to attempts
    if (otp.attempts >= 5) {
      return errorResponse('Ce code est invalidé suite à trop de tentatives. Veuillez en générer un nouveau.', 400);
    }

    // Check if expired
    if (new Date() > otp.expiresAt) {
      console.log(`[OTP] Code expired for order ${orderId} (${type})`);
      return errorResponse('Code invalide ou expiré', 400);
    }

    // Verify code
    if (otp.code !== code) {
      await db.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      console.log(`[OTP] Invalid code attempt for order ${orderId} (${type}). Total attempts: ${otp.attempts + 1}`);
      return errorResponse('Code invalide ou expiré', 400);
    }

    // Code is valid!
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return errorResponse('Commande non trouvée', 404);

    // Permission check: Only assigned rider or admin/dispatcher can verify
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER' && order.riderId !== auth.id) {
      return errorResponse('Non autorisé à vérifier l\'OTP pour cette commande', 403);
    }

    // Determine target status
    let targetStatus: OrderStatus;
    let historyNote: string;
    let paymentUpdate: any = {};

    if (type === OtpType.PICKUP) {
      targetStatus = OrderStatus.PICKED_UP;
      historyNote = 'Colis récupéré (OTP validé)';
      if (order.paymentMethod === PaymentMethod.CASH_AT_PICKUP) {
        paymentUpdate.paymentStatus = PaymentStatus.PAID;
      }
    } else {
      targetStatus = OrderStatus.DELIVERED;
      historyNote = 'Colis livré (OTP validé)';
      // If payment is CASH_AT_DELIVERY, mark as PAID upon delivery
      if (order.paymentMethod === PaymentMethod.CASH_AT_DELIVERY) {
        paymentUpdate.paymentStatus = PaymentStatus.PAID;
      }
    }

    validateTransition(order.status, targetStatus);

    // Perform updates in a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Mark OTP as verified
      await tx.otpCode.update({
        where: { id: otp.id },
        data: {
          verified: true,
          verifiedAt: new Date(),
        },
      });

      // 2. Update Order status and payment
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: targetStatus,
          ...paymentUpdate,
          statusHistory: {
            create: {
              status: targetStatus,
              note: historyNote,
            },
          },
        },
      });

      return updatedOrder;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    if (error.status === 409) return errorResponse(error.message, 409);
    console.error('OTP verify error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
