import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import { getOrder, updateOrderStatus } from "@/lib/db";
import { sendTelegramNotification, buildStatusChangeMessage } from "@/lib/telegram";

const VALID_STATUSES = ["confirmed", "preparing", "ready", "delivering", "delivered", "cancelled"];

const DELIVERY_TRANSITIONS: Record<string, string[]> = {
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivering", "cancelled"],
  delivering: ["delivered"],
  delivered: [],
  cancelled: [],
};

const PICKUP_TRANSITIONS: Record<string, string[]> = {
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const order = getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await request.json();
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate status transition — pickup-aware
    const currentStatus = order.order_status;
    const isPickup = order.customer_address.startsWith("Pickup") || order.customer_address.startsWith("Takeaway") || order.delivery_fee === 0;
    const transitions = isPickup ? PICKUP_TRANSITIONS : DELIVERY_TRANSITIONS;
    const allowedNext = transitions[currentStatus];
    if (!allowedNext || !allowedNext.includes(body.status)) {
      return NextResponse.json(
        { error: `Tidak bisa mengubah status dari '${currentStatus}' ke '${body.status}'` },
        { status: 400 }
      );
    }

    updateOrderStatus(id, body.status);

    // Send Telegram notification
    try {
      const message = buildStatusChangeMessage(id, body.status, order.customer_name);
      await sendTelegramNotification(message);
    } catch (err) {
      console.error("[PATCH /api/admin/orders/[id]] Telegram notification failed:", err);
    }

    const updated = getOrder(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/orders/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
