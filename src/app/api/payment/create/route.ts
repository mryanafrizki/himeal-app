import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrderPayment } from "@/lib/db";
import { createQRIS } from "@/lib/atlantic";
import {
  sendTelegramNotification,
  buildNewOrderMessage,
} from "@/lib/telegram";
import { PAYMENT_EXPIRY_MINUTES } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const body: { orderId: string } = await request.json();

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

    // Create QRIS payment
    const result = await createQRIS(body.orderId, order.total);

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

    // Send Telegram notification for new order
    const message = buildNewOrderMessage({
      orderId: body.orderId,
      orderType: order.customer_address.startsWith("Takeaway") ? "takeaway" : "delivery",
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerAddress: order.customer_address,
      addressNotes: order.address_notes,
      customerLat: order.customer_lat,
      customerLng: order.customer_lng,
      items: order.items.map((item) => ({
        name: item.product_name,
        qty: item.quantity,
        price: item.price,
        notes: item.notes,
      })),
      subtotal: order.subtotal,
      deliveryFee: order.delivery_fee,
      total: order.total,
      distanceKm: order.distance_km,
    });
    await sendTelegramNotification(message);

    return NextResponse.json({
      paymentId: result.data.id,
      qrString: result.data.qr_string,
      expiresAt,
      orderId: body.orderId,
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
