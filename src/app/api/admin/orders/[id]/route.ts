import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import { getOrder, updateOrderStatus, saveTelegramMessageId } from "@/lib/db";
import {
  sendTelegramNotification,
  editTelegramMessage,
  buildOrderMessage,
  buildStatusChangeMessage,
} from "@/lib/telegram";

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

    // Telegram: edit existing message or send new one
    try {
      const updatedOrder = getOrder(id)!;
      const telegramMsgId = order.telegram_message_id;

      if (telegramMsgId) {
        // Build status timeline from timestamps
        const timeline: { status: string; time: string }[] = [];
        const fmt = (ts: string | null) => {
          if (!ts) return "";
          try { return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
        };
        if (updatedOrder.confirmed_at) timeline.push({ status: "confirmed", time: fmt(updatedOrder.confirmed_at) });
        if (updatedOrder.preparing_at) timeline.push({ status: "preparing", time: fmt(updatedOrder.preparing_at) });
        if (updatedOrder.ready_at) timeline.push({ status: "ready", time: fmt(updatedOrder.ready_at) });
        if (updatedOrder.delivering_at) timeline.push({ status: "delivering", time: fmt(updatedOrder.delivering_at) });
        if (updatedOrder.delivered_at) timeline.push({ status: "delivered", time: fmt(updatedOrder.delivered_at) });
        if (body.status === "cancelled") timeline.push({ status: "cancelled", time: fmt(updatedOrder.updated_at) });

        const editedMsg = buildOrderMessage({
          orderId: id,
          orderType: isPickup ? "takeaway" : "delivery",
          customerName: updatedOrder.customer_name,
          customerPhone: updatedOrder.customer_phone,
          customerAddress: updatedOrder.customer_address,
          addressNotes: updatedOrder.address_notes,
          customerLat: updatedOrder.customer_lat,
          customerLng: updatedOrder.customer_lng,
          items: updatedOrder.items.map((item) => ({
            name: item.product_name,
            qty: item.quantity,
            price: item.price,
            notes: item.notes,
          })),
          subtotal: updatedOrder.subtotal,
          deliveryFee: updatedOrder.delivery_fee,
          total: updatedOrder.total,
          distanceKm: updatedOrder.distance_km,
        }, timeline);

        const edited = await editTelegramMessage(telegramMsgId, editedMsg);
        if (!edited) {
          // Fallback: send new message if edit fails
          const msgId = await sendTelegramNotification(editedMsg);
          if (msgId) saveTelegramMessageId(id, msgId);
        }
      } else {
        // No existing message — send new one (fallback)
        const message = buildStatusChangeMessage(id, body.status, order.customer_name);
        const msgId = await sendTelegramNotification(message);
        if (msgId) saveTelegramMessageId(id, msgId);
      }
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
