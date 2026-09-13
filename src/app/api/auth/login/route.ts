import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { errorResponse } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Données invalides', 400);
    }

    const { email, password } = result.data;

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return errorResponse('Identifiants invalides', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return errorResponse('Identifiants invalides', 401);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Posé directement par le serveur plutôt que par le client (document.cookie
    // après coup) : élimine toute course entre "le cookie est écrit" et "la
    // navigation vers /dashboard part avec ce cookie déjà présent" — sans ça,
    // le middleware pouvait voir la requête suivante sans cookie et renvoyer
    // vers /login, qui lui-même rebondit vers / puisqu'un cookie finissait
    // par exister entre-temps (course gagnée une fois sur deux selon la
    // latence réseau).
    response.cookies.set('fiatlux_token', token, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}