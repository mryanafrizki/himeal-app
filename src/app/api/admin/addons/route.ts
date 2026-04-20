import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { validateAdmin } from "@/lib/admin";
import { getAllAddons, createAddon, getProduct } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const addons = getAllAddons();

    // Group by product_id
    const grouped: Record<string, typeof addons> = {};
    for (const addon of addons) {
      if (!grouped[addon.product_id]) {
        grouped[addon.product_id] = [];
      }
      grouped[addon.product_id].push(addon);
    }

    return NextResponse.json({ addons, grouped });
  } catch (error) {
    console.error("[GET /api/admin/addons]", error);
    return NextResponse.json(
      { error: "Failed to load addons" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    const productId = body.productId || body.product_id;
    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (body.price === undefined || typeof body.price !== "number" || body.price < 0) {
      return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
    }

    const product = getProduct(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const id = "addon-" + nanoid(8);

    const addon = createAddon({
      id,
      product_id: productId,
      name: body.name.trim(),
      price: body.price,
      sort_order: body.sort_order,
    });

    return NextResponse.json(addon, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/addons]", error);
    return NextResponse.json(
      { error: "Failed to create addon" },
      { status: 500 }
    );
  }
}
