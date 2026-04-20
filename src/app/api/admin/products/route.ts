import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { validateAdmin } from "@/lib/admin";
import { getAllProducts, createProduct } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const products = getAllProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("[GET /api/admin/products]", error);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!body.price || typeof body.price !== "number" || body.price <= 0) {
      return NextResponse.json(
        { error: "Valid price is required" },
        { status: 400 }
      );
    }

    const id = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + nanoid(6);

    const product = createProduct({
      id,
      name: body.name.trim(),
      price: body.price,
      description: (body.description || "").trim(),
      image: (body.image || "").trim(),
      is_out_of_stock: body.isOutOfStock ? 1 : 0,
      max_order_qty: body.maxOrderQty || 0,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/products]", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
