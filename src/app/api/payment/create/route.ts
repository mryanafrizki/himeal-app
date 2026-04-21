import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrderPayment, getStoreSettings, updateOrderQrisInfo, validateVoucher, atomicApplyVoucher, rollbackVoucher, getDb } from "@/lib/db";
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

    // Consume voucher quota atomically at payment time (not order creation)
    let orderTotal = order.total;
    let voucherConsumed = false;
    let consumedVoucherId: string | null = null;

    // Case 1: Order already has voucher_id (set at order creation, but quota not consumed yet)
    if (order.voucher_id) {
      const result = atomicApplyVoucher(order.voucher_id);
      if (!result.success) {
        // Voucher quota ran out — clear voucher from order, recalculate total
        const db = getDb();
        const newTotal = order.subtotal + order.delivery_fee;
        db.prepare(
          "UPDATE orders SET voucher_id = NULL, voucher_discount = 0, voucher_code = NULL, total = ? WHERE id = ?"
        ).run(newTotal, body.orderId);
        return NextResponse.json(
          { error: "Kuota voucher sudah habis. Total diperbarui tanpa diskon.", voucherExpired: true, newTotal },
          { status: 409 }
        );
      }
      voucherConsumed = true;
      consumedVoucherId = order.voucher_id;
    }

    // Case 2: Late voucher application (voucherCode provided but order has no voucher_id)
    if (body.voucherCode && !order.voucher_id) {
      const voucherResult = validateVoucher(body.voucherCode, order.subtotal);
      if (voucherResult.valid && voucherResult.discount && voucherResult.discount > 0) {
        const applyResult = atomicApplyVoucher(voucherResult.voucher!.id);
        if (!applyResult.success) {
          return NextResponse.json(
            { error: applyResult.error || "Kuota voucher sudah habis" },
            { status: 409 }
          );
        }
        voucherConsumed = true;
        consumedVoucherId = voucherResult.voucher!.id;
        const discount = voucherResult.discount;
        orderTotal = Math.max(0, order.subtotal - discount + order.delivery_fee);
        const db = getDb();
        db.prepare(
          "UPDATE orders SET voucher_id = ?, voucher_discount = ?, voucher_code = ?, total = ? WHERE id = ?"
        ).run(voucherResult.voucher!.id, discount, body.voucherCode.toUpperCase(), orderTotal, body.orderId);
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
      // Rollback voucher consumption if QRIS creation failed
      if (voucherConsumed && consumedVoucherId) {
        rollbackVoucher(consumedVoucherId);
      }
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
