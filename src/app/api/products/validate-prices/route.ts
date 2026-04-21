import { NextRequest, NextResponse } from "next/server";
import { getProduct, getEffectivePrice } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items: { productId: string; price: number }[] = body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const result = items.map((item) => {
      const product = getProduct(item.productId);
      if (!product) {
        return {
          productId: item.productId,
          currentPrice: 0,
          originalPrice: 0,
          stale: true,
          removed: true,
        };
      }
      const currentPrice = getEffectivePrice(product);
      const originalPrice = product.price;
      return {
        productId: item.productId,
        currentPrice,
        originalPrice,
        stale: currentPrice !== item.price,
        removed: false,
      };
    });

    return NextResponse.json({ items: result });
  } catch (error) {
    console.error("[POST /api/products/validate-prices]", error);
    return NextResponse.json({ error: "Failed to validate prices" }, { status: 500 });
  }
}
