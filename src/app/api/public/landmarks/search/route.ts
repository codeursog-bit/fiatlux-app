import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    const landmarks = await db.landmark.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { aliases: { hasSome: [q.toLowerCase()] } },
        ],
      },
      select: { id: true, name: true, lat: true, lng: true, pricingZoneId: true },
      take: 8,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(landmarks);
  } catch (error) {
    console.error('Landmark search error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
