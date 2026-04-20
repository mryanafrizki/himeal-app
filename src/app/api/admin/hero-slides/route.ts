import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { validateAdmin } from "@/lib/admin";
import { getAllHeroSlides, createHeroSlide } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const slides = getAllHeroSlides();
    return NextResponse.json(slides);
  } catch (error) {
    console.error("[GET /api/admin/hero-slides]", error);
    return NextResponse.json(
      { error: "Failed to load hero slides" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const id = "slide-" + nanoid(8);

    const slide = createHeroSlide({
      id,
      title: body.title.trim(),
      subtitle: (body.subtitle || "").trim(),
      image: (body.image || "").trim(),
      sort_order: body.sort_order,
    });

    return NextResponse.json(slide, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/hero-slides]", error);
    return NextResponse.json(
      { error: "Failed to create hero slide" },
      { status: 500 }
    );
  }
}
