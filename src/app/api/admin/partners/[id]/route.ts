import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import { getPartner, updatePartner, deletePartner } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const existing = getPartner(id);
    if (!existing) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const body = await request.json();
    const updated = updatePartner(id, {
      name: body.name,
      logo_url: body.logo_url ?? body.logo ?? body.logoUrl,
      link_url: body.link_url ?? body.link ?? body.linkUrl,
      sort_order: body.sort_order,
      is_active: body.is_active,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/partners/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update partner" },
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
    const deleted = deletePartner(id);
    if (!deleted) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/partners/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete partner" },
      { status: 500 }
    );
  }
}
