import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrderPayment, getStoreSettings, updateOrderQrisInfo, validateVoucher, applyVoucher } from "@/lib/db";
import { createQRIS } from "@/lib/atlantic";
import { PAYMENT_EXPIRY_MINUTES } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const body: { orderId: string; voucherCode?: string } = await request.json();

    if (!body.orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    const order = getOrder(body.orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.order_status !== "pending_payment") {
      return NextResponse.json(
        { error: "Order is not pending payment" },
        { status: 400 }
      );
    }

    // Check QRIS settings
    const storeSettings = getStoreSettings();
    if (!storeSettings.qris_enabled) {
      return NextResponse.json(
        { error: "QRIS tidak aktif" },
        { status: 400 }
      );
    }

    // Apply voucher if provided and not already applied
    let orderTotal = order.total;
    if (body.voucherCode && !order.voucher_id) {
      const voucherResult = validateVoucher(body.voucherCode, order.subtotal);
      if (voucherResult.valid && voucherResult.discount && voucherResult.discount > 0) {
        const discount = voucherResult.discount;
        orderTotal = Math.max(0, order.subtotal - discount + order.delivery_fee);
        // Update order in DB with voucher info
        const db = (await import("@/lib/db")).getDb();
        db.prepare(
          "UPDATE orders SET voucher_id = ?, voucher_discount = ?, total = ? WHERE id = ?"
        ).run(voucherResult.voucher!.id, discount, orderTotal, body.orderId);
        applyVoucher(voucherResult.voucher!.id);
      }
    }

    // Kode unik = 0.7% (display only — Saweria PG adds this internally)
    const uniqueCode = Math.ceil(orderTotal * 0.007);
    const qrisFee = 0;
    const nominal = orderTotal; // exact amount, PG adds fee internally

    // Save QRIS info to order
    updateOrderQrisInfo(body.orderId, uniqueCode, qrisFee);

    // Create QRIS payment with calculated nominal
    const result = await createQRIS(body.orderId, nominal);

    if (!result.status || !result.data) {
      return NextResponse.json(
        { error: result.message || "Failed to create payment" },
        { status: 502 }
      );
    }

    // Calculate expiry (15 minutes from now)
    const expiresAt = new Date(
      Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    // Update order with payment info
    updateOrderPayment(
      body.orderId,
      result.data.id,
      result.data.qr_string,
      expiresAt
    );

    // Telegram notification moved to payment/status — only sent after payment confirmed

    return NextResponse.json({
      paymentId: result.data.id,
      qrString: result.data.qr_string,
      expiresAt,
      orderId: body.orderId,
      uniqueCode,
      nominal,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[POST /api/payment/create]", errMsg, error);
    return NextResponse.json(
      { error: `Failed to create payment: ${errMsg}` },
      { status: 500 }
    );
  }
}
