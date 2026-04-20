import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrderPaymentStatus } from "@/lib/db";
import { checkPaymentStatus } from "@/lib/atlantic";
import {
  sendTelegramNotification,
  buildNewOrderMessage,
  buildPaymentConfirmedMessage,
} from "@/lib/telegram";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = getOrder(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If already paid, return immediately
    if (order.payment_status === "success") {
      return NextResponse.json({
        status: "success",
        orderStatus: order.order_status,
      });
    }

    if (!order.payment_id) {
      return NextResponse.json(
        { error: "No payment found for this order" },
        { status: 400 }
      );
    }

    // Check with Atlantic
    let result;
    try {
      result = await checkPaymentStatus(order.payment_id);
      console.log("[Payment Status] Raw response:", JSON.stringify(result));
    } catch (atlanticError) {
      console.error("[Payment Status] Atlantic call failed:", atlanticError);
      return NextResponse.json({
        status: order.payment_status,
        orderStatus: order.order_status,
      });
    }

    if (!result.status && !result.data) {
      return NextResponse.json({
        status: order.payment_status,
        orderStatus: order.order_status,
      });
    }

    // Handle both response shapes: result.data.status (wrapped) or direct status string
    const paymentStatus = result.data?.status || (typeof result.status === "string" ? result.status : null);
    if (!paymentStatus || typeof paymentStatus !== "string") {
      return NextResponse.json({
        status: order.payment_status,
        orderStatus: order.order_status,
      });
    }

    if (paymentStatus === "success") {
      updateOrderPaymentStatus(id, "success", "confirmed");

      // Send full order notification to Telegram (only after payment confirmed)
      try {
        const paidOrder = getOrder(id);
        if (paidOrder) {
          const orderMsg = buildNewOrderMessage({
            orderId: id,
            orderType: paidOrder.customer_address.startsWith("Takeaway") ? "takeaway" : "delivery",
            customerName: paidOrder.customer_name,
            customerPhone: paidOrder.customer_phone,
            customerAddress: paidOrder.customer_address,
            addressNotes: paidOrder.address_notes,
            customerLat: paidOrder.customer_lat,
            customerLng: paidOrder.customer_lng,
            items: paidOrder.items.map((item) => ({
              name: item.product_name,
              qty: item.quantity,
              price: item.price,
              notes: item.notes,
            })),
            subtotal: paidOrder.subtotal,
            deliveryFee: paidOrder.delivery_fee,
            total: paidOrder.total,
            distanceKm: paidOrder.distance_km,
          });
          await sendTelegramNotification(orderMsg);
        }
      } catch (teleErr) {
        console.error("[Payment Status] Telegram notification failed:", teleErr);
      }

      return NextResponse.json({
        status: "success",
        orderStatus: "confirmed",
      });
    }

    if (paymentStatus === "expired") {
      updateOrderPaymentStatus(id, "expired", "payment_expired");

      return NextResponse.json({
        status: "expired",
        orderStatus: "payment_expired",
      });
    }

    // Still pending
    return NextResponse.json({
      status: paymentStatus,
      orderStatus: order.order_status,
    });
  } catch (error) {
    console.error("[GET /api/payment/status/[id]]", error);
    return NextResponse.json(
      { error: "Failed to check payment status" },
      { status: 500 }
    );
  }
}
