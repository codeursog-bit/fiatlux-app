import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { generateOtpCode } from '@/lib/otp';
import { OtpType } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id: orderId } = await params;
    const body = await req.json();
    const { type } = body;

    if (!type || !Object.values(OtpType).includes(type)) {
      return errorResponse('Type d\'OTP invalide (PICKUP ou DROPOFF requis)', 400);
    }

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return errorResponse('Commande non trouvée', 404);

    // Permission check: Only assigned rider or admin/dispatcher can generate OTP
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER' && order.riderId !== auth.id) {
      return errorResponse('Non autorisé à générer un OTP pour cette commande', 403);
    }

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate old unverified codes of the same type
    await db.otpCode.deleteMany({
      where: {
        orderId,
        type: type as OtpType,
        verified: false,
      },
    });

    const otp = await db.otpCode.create({
      data: {
        orderId,
        type: type as OtpType,
        code,
        expiresAt,
      },
    });

    // TODO: Branch SMS gateway here (e.g., Twilio, Infobip)
    // For now, we return the code in the response so the UI can display it for testing.
    console.log(`[OTP] Generated ${type} code for order ${order.trackingNumber}: ${code}`);

    return NextResponse.json({
      message: 'OTP généré avec succès',
      code: otp.code, // In production, don't return the code if sending via SMS
      expiresAt: otp.expiresAt,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('OTP generate error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
