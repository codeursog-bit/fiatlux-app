import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { ChatSenderType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, { role: 'rider' });

    const messages = await db.chatMessage.findMany({
      where: { riderId: auth.riderId },
      orderBy: { createdAt: 'asc' },
    });

    // Marque les messages ADMIN non lus comme lus dès que le chauffeur
    // ouvre sa conversation
    await db.chatMessage.updateMany({
      where: { riderId: auth.riderId, senderType: ChatSenderType.ADMIN, read: false },
      data: { read: true },
    });

    return NextResponse.json(messages);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Rider messages error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, { role: 'rider' });
    const { content } = await req.json();

    if (!content || !content.trim()) {
      return errorResponse('Message vide', 400);
    }

    const message = await db.chatMessage.create({
      data: {
        riderId: auth.riderId as string,
        senderType: ChatSenderType.RIDER,
        content: content.trim(),
      },
    });

    return NextResponse.json(message);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Rider send message error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
