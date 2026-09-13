import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const partner = await db.partner.findUnique({
      where: { email }
    });

    if (!partner || partner.status !== 'ACTIVE') {
      return NextResponse.json({ error: "Invalid credentials or account suspended" }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, partner.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign(
      { 
        partnerId: partner.id, 
        email: partner.email,
        type: 'partner' 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      token,
      partner: {
        id: partner.id,
        companyName: partner.companyName,
        email: partner.email,
      }
    });

  } catch (error) {
    console.error("Partner login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
