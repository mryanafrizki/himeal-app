import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import { getProduct, updateProduct, deleteProduct } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const existing = getProduct(id);
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    const updated = updateProduct(id, {
      name: body.name,
      price: body.price,
      description: body.description,
      image: body.image,
      is_active: body.is_active,
      sort_order: body.sort_order,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/products/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update product" },
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
    const deleted = deleteProduct(id);
    if (!deleted) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/products/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
