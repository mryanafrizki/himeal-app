import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import { getVoucher, updateVoucher, deleteVoucher } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const existing = getVoucher(id);
    if (!existing) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    const body = await request.json();
    const updated = updateVoucher(id, {
      code: body.code,
      discount_type: body.discountType,
      discount_value: body.discountValue,
      max_discount: body.maxDiscount,
      min_order: body.minOrder,
      quota: body.quota,
      valid_from: body.validFrom,
      valid_until: body.validUntil,
      is_active: body.isActive !== undefined ? (body.isActive ? 1 : 0) : undefined,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/vouchers/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update voucher" },
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
    const deleted = deleteVoucher(id);
    if (!deleted) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/vouchers/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete voucher" },
      { status: 500 }
    );
  }
}
