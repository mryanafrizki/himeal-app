import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrderStatus } from "@/lib/db";
import { cancelPayment } from "@/lib/atlantic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = getOrder(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If there's a pending payment, cancel it
    if (order.payment_id && order.payment_status === "pending") {
      try {
        await cancelPayment(order.payment_id);
      } catch (err) {
        console.error("[Cancel Payment]", err);
        // Continue with cancellation even if payment cancel fails
      }
    }

    updateOrderStatus(id, "cancelled");

    return NextResponse.json({ success: true, orderId: id, status: "cancelled" });
  } catch (error) {
    console.error("[POST /api/order/[id]/cancel]", error);
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}
