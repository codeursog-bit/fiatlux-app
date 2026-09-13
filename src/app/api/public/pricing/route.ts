import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zoneFrom = searchParams.get("zoneFrom");
  const zoneTo = searchParams.get("zoneTo");

  if (!zoneFrom || !zoneTo) {
    return NextResponse.json({ error: "Zones manquantes" }, { status: 400 });
  }

  try {
    // On cherche la PricingRule entre ces deux zones
    // Note: Dans prisma/seed.ts on a mappé les IDs des zones, mais ici on reçoit probablement les noms ou IDs
    // On va supposer qu'on reçoit les IDs pour être plus précis, ou on cherche par noms si besoin.
    // Pour simplifier on va chercher par IDs de zones (PricingZone.id)
    
    // On cherche la règle dans les deux sens : un trajet A→B et B→A
    // devrait avoir le même tarif, mais l'admin n'a peut-être créé la
    // règle que dans un seul sens.
    const rule = await db.pricingRule.findFirst({
      where: {
        OR: [
          { zoneFromId: zoneFrom, zoneToId: zoneTo },
          { zoneFromId: zoneTo, zoneToId: zoneFrom },
        ],
      },
    });

    if (!rule) {
      return NextResponse.json({ quotedManually: true });
    }

    if (rule.fixedAmount === null) {
      return NextResponse.json({ quotedManually: true });
    }

    return NextResponse.json({ 
      amount: rule.fixedAmount,
      quotedManually: false 
    });

  } catch (error) {
    console.error("Pricing error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
