import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { z } from 'zod';

const manualOrderSchema = z.object({
  description: z.string().min(2, 'Description requise'),
  amount: z.number().positive('Montant invalide'),
  note: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
});

/**
 * POST /api/riders/me/manual-order
 *
 * Un chauffeur qui a pris une course en roulant, sans passer par la
 * plateforme (client rencontré directement), peut l'enregistrer ici avec
 * le montant encaissé — pour que les recettes admin restent justes. La
 * commande est créée directement à l'état DELIVERED/PAYÉ (elle a déjà eu
 * lieu) et compte automatiquement dans les stats du chauffeur et dans le
 * résumé des paiements admin, comme n'importe quelle autre commande.
 *
 * Pas d'adresse de collecte/livraison réelle à saisir : on utilise la
 * position GPS du chauffeur au moment de la déclaration comme repère unique
 * (ce n'est pas un trajet à suivre, juste une trace comptable).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, { role: 'rider' });
    const body = await req.json();
    const result = manualOrderSchema.safeParse(body);
    if (!result.success) {
      return errorResponse(result.error.issues[0]?.message || 'Données invalides', 400);
    }
    const { description, amount, note, lat, lng } = result.data;

    const rider = await db.rider.findUnique({ where: { id: auth.riderId } });
    if (!rider) return errorResponse('Livreur introuvable', 404);

    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    const trackingNumber = `EXP-${timestamp}-${random}`;

    const order = await db.order.create({
      data: {
        trackingNumber,
        riderId: rider.id,
        guestCustomerName: 'Client hors plateforme',
        pickupAddress: note?.trim() || 'Course enregistrée manuellement par le chauffeur',
        pickupLat: lat,
        pickupLng: lng,
        dropoffAddress: note?.trim() || 'Course enregistrée manuellement par le chauffeur',
        dropoffLat: lat,
        dropoffLng: lng,
        recipientName: 'Client hors plateforme',
        recipientPhone: '',
        packageDescription: description,
        amount,
        paymentMethod: PaymentMethod.CASH_AT_PICKUP,
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.DELIVERED,
        loggedManually: true,
        statusHistory: {
          create: {
            status: OrderStatus.DELIVERED,
            note: `Course enregistrée manuellement par ${rider.name} (hors plateforme)`,
          },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return errorResponse('Non autorisé', 401);
    console.error('Manual order error:', error);
    return errorResponse('Erreur serveur', 500);
  }
}
