import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req, { role: 'admin' });

    const { riderId, password } = await req.json();

    if (!riderId || !password || password.length < 4) {
      return errorResponse('Chauffeur et mot de passe (4 caractères minimum) requis', 400);
    }

    const rider = await db.rider.findUnique({ where: { id: riderId } });
    if (!rider) {
      return errorResponse('Chauffeur introuvable', 404);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.rider.update({ where: { id: riderId }, data: { passwordHash } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Set rider password error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
