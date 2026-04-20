import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import { updateAddon, deleteAddon, getAddon } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const existing = getAddon(id);
    if (!existing) {
      return NextResponse.json({ error: "Addon not found" }, { status: 404 });
    }

    const body = await request.json();
    const updated = updateAddon(id, {
      name: body.name,
      price: body.price,
      is_active: body.is_active,
      sort_order: body.sort_order,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/addons/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update addon" },
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
    const deleted = deleteAddon(id);
    if (!deleted) {
      return NextResponse.json({ error: "Addon not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/addons/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete addon" },
      { status: 500 }
    );
  }
}
