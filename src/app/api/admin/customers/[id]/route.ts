import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { CustomerType } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req);
    const { id } = await params;

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            rider: { select: { name: true } }
          }
        },
      },
    });

    if (!customer) {
      return errorResponse('Client non trouvé', 404);
    }

    return NextResponse.json(customer);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER') {
      return errorResponse('Non autorisé', 403);
    }

    const { id } = await params;
    const body = await req.json();

    const updatedCustomer = await db.customer.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone,
        type: body.type as CustomerType,
        address: body.address,
        billingMode: body.billingMode,
      },
    });

    return NextResponse.json(updatedCustomer);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Customer PATCH error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
