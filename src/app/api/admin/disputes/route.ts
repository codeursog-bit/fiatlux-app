import { db } from "@/lib/db";
import { requireAuth, errorResponse } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { DisputeStatus, DisputeType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER') {
      return errorResponse('Accès refusé', 403);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as DisputeStatus | null;
    const type = searchParams.get('type') as DisputeType | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(type && { type }),
    };

    const [disputes, total] = await Promise.all([
      db.dispute.findMany({
        where,
        include: {
          order: {
            select: {
              trackingNumber: true,
              status: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.dispute.count({ where }),
    ]);

    return NextResponse.json({
      disputes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Admin disputes GET error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
