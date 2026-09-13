import { NextRequest, NextResponse } from "next/server";
import { runDisputeDetection } from "@/lib/dispute-detection";

/**
 * Route système pour déclencher la détection des litiges.
 * À appeler par un cron externe (ex: toutes les 5-10 minutes) avec le
 * header x-system-key correspondant à SYSTEM_KEY dans les variables
 * d'environnement — jamais laissée ouverte, sinon n'importe qui peut
 * spammer la création de litiges.
 */
export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-system-key");
    const expectedKey = process.env.SYSTEM_KEY;

    if (!expectedKey) {
      console.error("SYSTEM_KEY non configurée — check-disputes refusé par défaut");
      return NextResponse.json({ error: "Non configuré" }, { status: 503 });
    }

    if (apiKey !== expectedKey) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    await runDisputeDetection();

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("System check-disputes error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
