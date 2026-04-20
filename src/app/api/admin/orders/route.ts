import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import { getAllOrders } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const orders = getAllOrders();

    // Payment status filter
    const { searchParams } = new URL(request.url);
    const paymentStatusFilter = searchParams.get("payment_status") || "all";

    const filtered =
      paymentStatusFilter === "all"
        ? orders
        : orders.filter((o) => o.payment_status === paymentStatusFilter);

    // Count per payment status
    const paymentStatusCount = {
      all: orders.length,
      pending: orders.filter((o) => o.payment_status === "pending").length,
      success: orders.filter((o) => o.payment_status === "success").length,
      expired: orders.filter((o) => o.payment_status === "expired").length,
    };

    return NextResponse.json({
      orders: filtered,
      paymentStatusCount,
    });
  } catch (error) {
    console.error("[GET /api/admin/orders]", error);
    return NextResponse.json(
      { error: "Failed to load orders" },
      { status: 500 }
    );
  }
}
