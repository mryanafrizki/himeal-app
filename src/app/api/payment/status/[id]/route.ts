import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrderPaymentStatus } from "@/lib/db";
import { checkPaymentStatus } from "@/lib/atlantic";
import {
  sendTelegramNotification,
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
    const result = await checkPaymentStatus(order.payment_id);

    if (!result.status || !result.data) {
      return NextResponse.json({
        status: order.payment_status,
        orderStatus: order.order_status,
      });
    }

    const paymentStatus = result.data.status;

    if (paymentStatus === "success") {
      updateOrderPaymentStatus(id, "success", "confirmed");

      // Send Telegram notification
      const message = buildPaymentConfirmedMessage(id, order.total);
      await sendTelegramNotification(message);

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
