import { NextResponse } from "next/server";
import { getActiveProducts, getEffectivePrice } from "@/lib/db";

export async function GET() {
  try {
    const products = getActiveProducts();
    return NextResponse.json(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description,
        image: p.image,
        is_out_of_stock: p.is_out_of_stock,
        max_order_qty: p.max_order_qty,
        promo_price: p.promo_price,
        promo_end_date: p.promo_end_date,
        effective_price: getEffectivePrice(p),
      }))
    );
  } catch (error) {
    console.error("[GET /api/products]", error);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}
