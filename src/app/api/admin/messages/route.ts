import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { ChatSenderType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, { role: 'admin' });

    // Un chauffeur = une conversation. On récupère tous les riders ayant
    // au moins un message, avec le dernier message et le nombre de non-lus.
    const riders = await db.rider.findMany({
      where: { messages: { some: {} } },
      select: {
        id: true,
        name: true,
        phone: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: { senderType: ChatSenderType.RIDER, read: false },
            },
          },
        },
      },
    });

    const conversations = riders
      .map((r: (typeof riders)[number]) => ({
        riderId: r.id,
        riderName: r.name,
        riderPhone: r.phone,
        lastMessage: r.messages[0] || null,
        unreadCount: r._count.messages,
      }))
      .sort((a: { lastMessage: { createdAt: Date } | null }, b: { lastMessage: { createdAt: Date } | null }) => {
        const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return dateB - dateA;
      });

    return NextResponse.json(conversations);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Admin messages list error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
