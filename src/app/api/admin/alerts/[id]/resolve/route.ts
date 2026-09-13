import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER') {
      return errorResponse('Seuls les dispatchers peuvent résoudre les alertes', 403);
    }

    const { id } = await params;

    const alert = await db.alert.findUnique({ where: { id } });
    if (!alert) return errorResponse('Alerte non trouvée', 404);

    const updatedAlert = await db.alert.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json(updatedAlert);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Alert resolve error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
