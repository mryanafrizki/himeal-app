import { NextRequest, NextResponse } from "next/server";
import { getAddonsForProduct, getProduct } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = getProduct(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const addons = getAddonsForProduct(id);
    return NextResponse.json(addons);
  } catch (error) {
    console.error("[GET /api/products/[id]/addons]", error);
    return NextResponse.json(
      { error: "Failed to load addons" },
      { status: 500 }
    );
  }
}
