import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrderStatus } from "@/lib/db";
import {
  sendTelegramNotification,
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

    // Send Telegram notification
    const message = buildStatusChangeMessage(id, body.status, order.customer_name);
    await sendTelegramNotification(message);

    return NextResponse.json({ success: true, orderId: id, status: body.status });
  } catch (error) {
    console.error("[PATCH /api/order/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}
