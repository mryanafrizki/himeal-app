import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import { getOrder, updateOrderStatus } from "@/lib/db";

const VALID_STATUSES = ["confirmed", "preparing", "delivering", "delivered"];

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

    updateOrderStatus(id, body.status);
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
