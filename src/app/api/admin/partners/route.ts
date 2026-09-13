import { db } from "@/lib/db";
import { requireAuth, errorResponse } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, { role: 'admin' });
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [partners, total] = await Promise.all([
      db.partner.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          _count: {
            select: { orders: true }
          }
        }
      }),
      db.partner.count(),
    ]);

    // Map to include totalOrders for compatibility if needed
    const formatted = partners.map(p => ({
      ...p,
      totalOrders: p._count.orders
    }));

    return NextResponse.json({
      partners: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Admin partners GET error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, { role: 'admin' });
    const { companyName, contactName, email, password, phone } = await req.json();

    if (!email || !password || !companyName) {
      return errorResponse('Missing required fields', 400);
    }

    const existing = await db.partner.findUnique({ where: { email } });
    if (existing) {
      return errorResponse('Partner with this email already exists', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const partner = await db.partner.create({
      data: {
        companyName,
        contactName,
        email,
        passwordHash,
        phone,
        status: 'ACTIVE'
      }
    });

    return NextResponse.json(partner);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Admin partners POST error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
