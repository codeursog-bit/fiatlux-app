import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, { role: 'rider' });
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, phone: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        confirmations: { orderBy: { createdAt: 'desc' } },
        transactions: true,
      },
    });

    if (!order) {
      return errorResponse('Commande non trouvée', 404);
    }

    // Jamais l'ordre d'un autre chauffeur, même si l'ID est deviné
    if (order.riderId !== auth.riderId) {
      return errorResponse('Accès non autorisé à cette commande', 403);
    }

    return NextResponse.json(order);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Rider order detail error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
