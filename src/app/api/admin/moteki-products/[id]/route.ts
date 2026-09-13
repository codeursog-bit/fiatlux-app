import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req, { role: 'admin' });
    const { id } = await params;
    const { productUuid, label } = await req.json();

    const product = await db.motekiProduct.update({
      where: { id },
      data: {
        ...(productUuid !== undefined && { productUuid }),
        ...(label !== undefined && { label }),
      },
    });

    return NextResponse.json(product);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Moteki product update error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req, { role: 'admin' });
    const { id } = await params;
    await db.motekiProduct.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Moteki product delete error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
