import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { PaymentMethod } from '@prisma/client';

const VALID_METHODS: PaymentMethod[] = [
  'ONLINE',
  'ONLINE_MTN',
  'ONLINE_AIRTEL',
  'CASH_AT_PICKUP',
  'CASH_AT_DELIVERY',
] as PaymentMethod[];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req, { role: 'admin' });

    const { id } = await params;
    const { paymentMethod } = await req.json();

    if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
      return errorResponse('Mode de paiement invalide', 400);
    }

    const order = await db.order.update({
      where: { id },
      data: { paymentMethod },
    });

    return NextResponse.json(order);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Update payment method error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
