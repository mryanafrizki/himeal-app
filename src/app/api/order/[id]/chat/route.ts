import { NextRequest, NextResponse } from "next/server";
import { getOrder, getChatMessages, createChatMessage } from "@/lib/db";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "himeal2026";

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

    const { searchParams } = new URL(request.url);
    const afterId = searchParams.get("after");

    const messages = getChatMessages(id, afterId ? parseInt(afterId, 10) : undefined);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[GET /api/order/[id]/chat]", error);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}

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

    // Check order is active (not delivered/cancelled)
    if (order.order_status === "delivered" || order.order_status === "cancelled") {
      return NextResponse.json(
        { error: "Chat tidak tersedia untuk pesanan yang sudah selesai atau dibatalkan" },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.message || typeof body.message !== "string" || body.message.trim().length === 0) {
      return NextResponse.json({ error: "Pesan wajib diisi" }, { status: 400 });
    }

    const sender = body.sender || "user";
    if (!["user", "admin"].includes(sender)) {
      return NextResponse.json({ error: "Invalid sender" }, { status: 400 });
    }

    // If sender is admin, validate admin key
    if (sender === "admin") {
      const key = request.headers.get("x-admin-key");
      if (key !== ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const message = createChatMessage(id, sender, body.message.trim());

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("[POST /api/order/[id]/chat]", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
