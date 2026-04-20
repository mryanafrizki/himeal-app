import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import { updateHeroSlide, deleteHeroSlide } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();

    const updated = updateHeroSlide(id, {
      title: body.title,
      subtitle: body.subtitle,
      image: body.image,
      sort_order: body.sort_order,
      is_active: body.is_active,
    });

    if (!updated) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/hero-slides/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update hero slide" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const deleted = deleteHeroSlide(id);
    if (!deleted) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/hero-slides/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete hero slide" },
      { status: 500 }
    );
  }
}
