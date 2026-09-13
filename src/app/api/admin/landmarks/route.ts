import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, { role: 'admin' });

    const landmarks = await db.landmark.findMany({
      include: { pricingZone: { select: { id: true, zoneName: true } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(landmarks);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Landmarks list error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req, { role: 'admin' });

    const { name, aliases, lat, lng, pricingZoneId } = await req.json();

    if (!name || lat === undefined || lng === undefined) {
      return errorResponse('Nom et coordonnées requis', 400);
    }

    const landmark = await db.landmark.create({
      data: {
        name,
        aliases: Array.isArray(aliases) ? aliases.map((a: string) => a.toLowerCase()) : [],
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        pricingZoneId: pricingZoneId || null,
      },
    });

    return NextResponse.json(landmark);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Landmark create error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
