import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { normalizePhone } from '@/lib/phone';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: 'Téléphone et mot de passe requis' }, { status: 400 });
    }

    const normalized = normalizePhone(phone);

    // Tentative directe (cas normal : le numéro est stocké normalisé).
    let rider = await db.rider.findUnique({ where: { phone: normalized } });

    // Repli : certains numéros existants en base ont pu être enregistrés
    // avant la normalisation (avec espaces, indicatif +242...). On les
    // retrouve en comparant chaque numéro normalisé côté serveur.
    if (!rider) {
      const candidates = await db.rider.findMany({ select: { id: true, phone: true } });
      const match = candidates.find((c) => normalizePhone(c.phone) === normalized);
      if (match) {
        rider = await db.rider.findUnique({ where: { id: match.id } });
      }
    }

    if (!rider || !rider.passwordHash) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, rider.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    const token = jwt.sign(
      { riderId: rider.id, type: 'rider' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      token,
      rider: { id: rider.id, name: rider.name, phone: rider.phone, status: rider.status },
    });
  } catch (error) {
    console.error('Rider login error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}