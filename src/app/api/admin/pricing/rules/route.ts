import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, { role: 'admin' });
    const rules = await db.pricingRule.findMany({
        orderBy: { zoneFromId: 'asc' }
    });
    return NextResponse.json(rules);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req, { role: 'admin' });
    const { zoneFromId, zoneToId, fixedAmount } = await req.json();

    if (!zoneFromId || !zoneToId) return errorResponse('Zones source et destination requises', 400);

    const rule = await db.pricingRule.create({
      data: {
        zoneFromId,
        zoneToId,
        fixedAmount: fixedAmount !== undefined ? parseFloat(fixedAmount) : null,
      },
    });

    return NextResponse.json(rule);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    return errorResponse('Erreur serveur', 500);
  }
}
