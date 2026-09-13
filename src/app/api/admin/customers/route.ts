import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { CustomerType, Prisma } from '@prisma/client';
import { z } from 'zod';

const createCustomerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  type: z.nativeEnum(CustomerType),
  address: z.string(),
  billingMode: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as CustomerType | null;
    const q = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (type) where.type = type;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      db.customer.count({ where }),
    ]);

    return NextResponse.json({
      customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Customers GET error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== 'ADMIN' && auth.role !== 'DISPATCHER') {
      return errorResponse('Non autorisé', 403);
    }

    const body = await req.json();
    const result = createCustomerSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Données invalides', 400);
    }

    const customer = await db.customer.create({
      data: result.data,
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Customers POST error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
