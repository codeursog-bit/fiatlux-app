import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { normalizePhone } from "@/lib/phone";
import { OrderStatus } from "@prisma/client";

const TERMINAL_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.FAILED];
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Public search for tracking links.
 * Requires at least a phone number to verify identity.
 *
 * - Téléphone seul : renvoie TOUTES les commandes actives liées à ce numéro
 *   (l'utilisateur choisit ensuite laquelle suivre) — avant ce fix, seule la
 *   plus récente était renvoyée, les autres étaient invisibles.
 * - Téléphone + n° de commande : renvoie uniquement cette commande précise.
 *
 * Validité d'un lien : une commande encore en cours n'expire jamais (sinon
 * une livraison qui traîne verrouille le client hors de sa propre commande
 * active) ; une fois terminée, le lien reste valide 7 jours après la fin
 * réelle (order.updatedAt), pas depuis la création de la commande.
 */
export async function POST(req: NextRequest) {
  try {
    const { trackingNumber, phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Le numéro de téléphone est requis pour la vérification." }, { status: 400 });
    }

    // Sans normalisation, "06 412 34 56" tapé à la commande ne matchait
    // jamais "0641234 56" ou "+242 641 234 56" tapé ici — comparaison en
    // chaîne stricte alors que ce sont le même numéro. Même normalisation
    // que celle appliquée au stockage (voir src/lib/phone.ts).
    const normalizedPhone = normalizePhone(phone);

    const links = await db.trackingLink.findMany({
      where: {
        phone: normalizedPhone,
        ...(trackingNumber ? { order: { trackingNumber: trackingNumber.trim().toUpperCase() } } : {}),
      },
      include: {
        order: {
          select: {
            id: true,
            trackingNumber: true,
            status: true,
            pickupAddress: true,
            dropoffAddress: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const validLinks = links.filter((link) => {
      const isTerminal = TERMINAL_STATUSES.includes(link.order.status);
      if (!isTerminal) return true;
      return Date.now() - link.order.updatedAt.getTime() <= GRACE_PERIOD_MS;
    });

    if (validLinks.length === 0) {
      return NextResponse.json({
        error: "Aucune commande active trouvée avec ces informations."
      }, { status: 404 });
    }

    // Une même commande a 2 TrackingLink (expéditeur + destinataire) — pour
    // une commande "Moi-même", le même numéro matche les deux. On ne garde
    // qu'une entrée par commande, peu importe le rôle.
    const seenOrderIds = new Set<string>();
    const orders = [];
    for (const link of validLinks.slice(0, 20)) {
      if (seenOrderIds.has(link.order.id)) continue;
      seenOrderIds.add(link.order.id);
      orders.push({
        token: link.token,
        trackingNumber: link.order.trackingNumber,
        status: link.order.status,
        pickupAddress: link.order.pickupAddress,
        dropoffAddress: link.order.dropoffAddress,
        createdAt: link.order.createdAt,
      });
    }

    return NextResponse.json({ success: true, orders });

  } catch (error) {
    console.error("Tracking search API error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}