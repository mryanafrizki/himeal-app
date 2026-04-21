import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import {
  getProduct,
  getProductIngredients,
  createProductIngredient,
  updateProductIngredient,
  deleteProductIngredient,
  syncProductHpp,
  calculateProductHpp,
} from "@/lib/db";
import { nanoid } from "nanoid";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const product = getProduct(id);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const ingredients = getProductIngredients(id);
  const calculatedHpp = calculateProductHpp(id);

  return NextResponse.json({
    ingredients,
    calculatedHpp,
    currentHpp: product.hpp,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const product = getProduct(id);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const body = await request.json();
  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Nama bahan wajib diisi" }, { status: 400 });
  }

  const ingredient = createProductIngredient({
    id: nanoid(10),
    product_id: id,
    name: body.name.trim(),
    amount: body.amount || 0,
    unit: body.unit || "gr",
    bulk_price: body.bulk_price || 0,
    bulk_amount: body.bulk_amount || 0,
    used_amount: body.used_amount || 0,
  });

  // Auto-sync product HPP
  const newHpp = syncProductHpp(id);

  return NextResponse.json({ ingredient, newHpp }, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  const { id: productId } = await params;
  const body = await request.json();

  if (!body.ingredientId) {
    return NextResponse.json({ error: "ingredientId required" }, { status: 400 });
  }

  const updated = updateProductIngredient(body.ingredientId, {
    name: body.name,
    amount: body.amount,
    unit: body.unit,
    bulk_price: body.bulk_price,
    bulk_amount: body.bulk_amount,
    used_amount: body.used_amount,
    sort_order: body.sort_order,
  });

  // Auto-sync product HPP
  const newHpp = syncProductHpp(productId);

  return NextResponse.json({ ingredient: updated, newHpp });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  const { id: productId } = await params;
  const { searchParams } = new URL(request.url);
  const ingredientId = searchParams.get("ingredientId");

  if (!ingredientId) {
    return NextResponse.json({ error: "ingredientId required" }, { status: 400 });
  }

  deleteProductIngredient(ingredientId);

  // Auto-sync product HPP
  const newHpp = syncProductHpp(productId);

  return NextResponse.json({ success: true, newHpp });
}
