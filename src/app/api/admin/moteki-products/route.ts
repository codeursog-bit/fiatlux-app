import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, { role: 'admin' });
    const products = await db.motekiProduct.findMany({ orderBy: { amount: 'asc' } });
    return NextResponse.json(products);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Moteki products list error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req, { role: 'admin' });
    const { amount, productUuid, label } = await req.json();

    if (!amount || !productUuid) {
      return errorResponse('Montant et UUID du produit Moteki requis', 400);
    }

    const product = await db.motekiProduct.create({
      data: { amount: parseInt(amount, 10), productUuid, label },
    });

    return NextResponse.json(product);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    if (error.code === 'P2002') return errorResponse('Ce montant a déjà un produit associé', 409);
    console.error('Moteki product create error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
