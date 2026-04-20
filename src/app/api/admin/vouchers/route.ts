import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { validateAdmin } from "@/lib/admin";
import { getAllVouchers, createVoucher } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const vouchers = getAllVouchers();
    return NextResponse.json(vouchers);
  } catch (error) {
    console.error("[GET /api/admin/vouchers]", error);
    return NextResponse.json(
      { error: "Failed to load vouchers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    if (!body.code || typeof body.code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }
    if (!body.discountType || !["percentage", "fixed"].includes(body.discountType)) {
      return NextResponse.json({ error: "Valid discount type is required (percentage or fixed)" }, { status: 400 });
    }
    if (!body.discountValue || typeof body.discountValue !== "number" || body.discountValue <= 0) {
      return NextResponse.json({ error: "Valid discount value is required" }, { status: 400 });
    }
    if (!body.quota || typeof body.quota !== "number" || body.quota <= 0) {
      return NextResponse.json({ error: "Valid quota is required" }, { status: 400 });
    }
    if (!body.validFrom || !body.validUntil) {
      return NextResponse.json({ error: "Valid date range is required" }, { status: 400 });
    }

    const voucher = createVoucher({
      id: nanoid(12),
      code: body.code.toUpperCase().trim(),
      discount_type: body.discountType,
      discount_value: body.discountValue,
      max_discount: body.maxDiscount || null,
      min_order: body.minOrder || 0,
      quota: body.quota,
      valid_from: body.validFrom,
      valid_until: body.validUntil,
    });

    return NextResponse.json(voucher, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/vouchers]", error);
    const message = error instanceof Error && error.message.includes("UNIQUE")
      ? "Kode voucher sudah digunakan"
      : "Failed to create voucher";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
