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
    // Accept both camelCase and snake_case field names
    const discountType = body.discountType || body.discount_type;
    const discountValue = body.discountValue ?? body.discount_value;
    const maxDiscount = body.maxDiscount ?? body.max_discount;
    const minOrder = body.minOrder ?? body.min_order;
    const quota = body.quota;
    const validFrom = body.validFrom || body.start_date;
    const validUntil = body.validUntil || body.end_date;

    if (!discountType || !["percentage", "fixed"].includes(discountType)) {
      return NextResponse.json({ error: "Valid discount type is required (percentage or fixed)" }, { status: 400 });
    }
    if (!discountValue || typeof discountValue !== "number" || discountValue <= 0) {
      return NextResponse.json({ error: "Valid discount value is required" }, { status: 400 });
    }
    if (!quota || typeof quota !== "number" || quota <= 0) {
      return NextResponse.json({ error: "Valid quota is required" }, { status: 400 });
    }
    if (!validFrom || !validUntil) {
      return NextResponse.json({ error: "Valid date range is required" }, { status: 400 });
    }

    const voucher = createVoucher({
      id: nanoid(12),
      code: body.code.toUpperCase().trim(),
      discount_type: discountType,
      discount_value: discountValue,
      max_discount: maxDiscount || null,
      min_order: minOrder || 0,
      quota,
      valid_from: validFrom,
      valid_until: validUntil,
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
