import { NextRequest, NextResponse } from "next/server";
import { validateVoucher } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.code || typeof body.code !== "string") {
      return NextResponse.json({ error: "Kode voucher wajib diisi" }, { status: 400 });
    }
    if (!body.orderTotal || typeof body.orderTotal !== "number" || body.orderTotal <= 0) {
      return NextResponse.json({ error: "Total pesanan tidak valid" }, { status: 400 });
    }

    const result = validateVoucher(body.code, body.orderTotal);

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        error: result.error,
      });
    }

    return NextResponse.json({
      valid: true,
      discount: result.discount,
      discountType: result.voucher!.discount_type,
      voucherCode: result.voucher!.code,
    });
  } catch (error) {
    console.error("[POST /api/voucher/validate]", error);
    return NextResponse.json(
      { error: "Gagal memvalidasi voucher" },
      { status: 500 }
    );
  }
}
