import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrderStatus, saveTelegramMessageId } from "@/lib/db";
import {
  sendTelegramNotification,
  editTelegramMessage,
  buildOrderMessage,
  buildStatusChangeMessage,
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

    return NextResponse.json(order);
  } catch (error) {
    console.error("[GET /api/order/[id]]", error);
    return NextResponse.json(
      { error: "Failed to get order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: { status: string } = await request.json();

    if (!body.status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const order = getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    updateOrderStatus(id, body.status);

    // Telegram: edit existing or send new
    try {
      const telegramMsgId = order.telegram_message_id;
      if (telegramMsgId) {
        const updatedOrder = getOrder(id)!;
        const isPickup = updatedOrder.customer_address.startsWith("Pickup") || updatedOrder.customer_address.startsWith("Takeaway") || updatedOrder.delivery_fee === 0;
        const fmt = (ts: string | null) => {
          if (!ts) return "";
          try { return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
        };
        const timeline: { status: string; time: string }[] = [];
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
          const msgId = await sendTelegramNotification(editedMsg);
          if (msgId) saveTelegramMessageId(id, msgId);
        }
      } else {
        const message = buildStatusChangeMessage(id, body.status, order.customer_name);
        const msgId = await sendTelegramNotification(message);
        if (msgId) saveTelegramMessageId(id, msgId);
      }
    } catch (err) {
      console.error("[PATCH /api/order/[id]] Telegram failed:", err);
    }

    return NextResponse.json({ success: true, orderId: id, status: body.status });
  } catch (error) {
    console.error("[PATCH /api/order/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}
