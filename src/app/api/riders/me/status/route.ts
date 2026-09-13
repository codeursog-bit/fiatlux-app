import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { RiderStatus } from '@prisma/client';

// Permet au chauffeur de basculer lui-même "en ligne"/"hors ligne"
// (self-service) — distinct de PATCH /api/admin/riders/[id] réservé à
// l'admin/dispatcher. On restreint volontairement aux deux statuts que le
// chauffeur peut choisir lui-même : jamais BUSY (réservé au système lors
// d'une course active).
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, { role: 'rider' });
    const riderId = auth.riderId!;

    const { status } = await req.json();
    if (status !== RiderStatus.ACTIVE && status !== RiderStatus.INACTIVE) {
      return errorResponse('Statut invalide', 400);
    }

    const rider = await db.rider.update({
      where: { id: riderId },
      data: { status },
    });

    return NextResponse.json({ id: rider.id, status: rider.status });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Rider self-service status error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}