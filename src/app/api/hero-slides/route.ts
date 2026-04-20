import { NextResponse } from "next/server";
import { getActiveHeroSlides } from "@/lib/db";

export async function GET() {
  try {
    const slides = getActiveHeroSlides();
    return NextResponse.json(slides);
  } catch (error) {
    console.error("[GET /api/hero-slides]", error);
    return NextResponse.json(
      { error: "Failed to load hero slides" },
      { status: 500 }
    );
  }
}
