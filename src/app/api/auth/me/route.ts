import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    
    const user = await db.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return errorResponse('Utilisateur non trouvé', 404);
    }

    return NextResponse.json(user);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return errorResponse('Non autorisé', 401);
    }
    return errorResponse('Erreur serveur', 500);
  }
}
