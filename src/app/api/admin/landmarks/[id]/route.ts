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
    const { name, aliases, lat, lng, pricingZoneId, active } = await req.json();

    const landmark = await db.landmark.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(aliases !== undefined && { aliases: aliases.map((a: string) => a.toLowerCase()) }),
        ...(lat !== undefined && { lat: parseFloat(lat) }),
        ...(lng !== undefined && { lng: parseFloat(lng) }),
        ...(pricingZoneId !== undefined && { pricingZoneId: pricingZoneId || null }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json(landmark);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Landmark update error:', error);
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

    const usedCount = await db.order.count({
      where: { OR: [{ pickupLandmarkId: id }, { dropoffLandmarkId: id }] },
    });

    if (usedCount > 0) {
      // Jamais de suppression réelle si des commandes y font référence —
      // on désactive à la place pour ne pas casser l'historique.
      const landmark = await db.landmark.update({ where: { id }, data: { active: false } });
      return NextResponse.json({ deactivated: true, landmark });
    }

    await db.landmark.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Landmark delete error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
