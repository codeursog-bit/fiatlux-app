import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { ChatSenderType } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ riderId: string }> }
) {
  try {
    await requireAuth(req, { role: 'admin' });
    const { riderId } = await params;

    const messages = await db.chatMessage.findMany({
      where: { riderId },
      orderBy: { createdAt: 'asc' },
    });

    await db.chatMessage.updateMany({
      where: { riderId, senderType: ChatSenderType.RIDER, read: false },
      data: { read: true },
    });

    return NextResponse.json(messages);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Admin conversation error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ riderId: string }> }
) {
  try {
    const auth = await requireAuth(req, { role: 'admin' });
    const { riderId } = await params;
    const { content } = await req.json();

    if (!content || !content.trim()) {
      return errorResponse('Message vide', 400);
    }

    const rider = await db.rider.findUnique({ where: { id: riderId } });
    if (!rider) {
      return errorResponse('Chauffeur introuvable', 404);
    }

    const message = await db.chatMessage.create({
      data: {
        riderId,
        senderType: ChatSenderType.ADMIN,
        senderUserId: auth.id,
        content: content.trim(),
      },
    });

    return NextResponse.json(message);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Admin send message error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
