import { NextResponse } from "next/server";
import { getActivePartners } from "@/lib/db";

export async function GET() {
  try {
    const partners = getActivePartners();
    return NextResponse.json(partners);
  } catch (error) {
    console.error("[GET /api/partners]", error);
    return NextResponse.json(
      { error: "Failed to load partners" },
      { status: 500 }
    );
  }
}
