import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const zones = await db.pricingZone.findMany({
      orderBy: { zoneName: 'asc' }
    });
    return NextResponse.json(zones);
  } catch (error) {
    console.error("Pricing zones GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
