import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import { getAllOrders, getOrdersPaginated } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "0", 10);
    const status = searchParams.get("status") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const paymentStatusFilter = searchParams.get("payment_status") || "all";

    // If pagination params provided, use paginated query
    if (page > 0 && limit > 0) {
      const result = getOrdersPaginated({
        page,
        limit,
        status,
        from,
        to,
        paymentStatus: paymentStatusFilter,
      });

      const totalPages = Math.ceil(result.total / limit);

      // Count per payment status (from all matching orders, not just current page)
      const allOrders = getAllOrders();
      const paymentStatusCount = {
        all: allOrders.length,
        pending: allOrders.filter((o) => o.payment_status === "pending").length,
        success: allOrders.filter((o) => o.payment_status === "success").length,
        expired: allOrders.filter((o) => o.payment_status === "expired").length,
      };

      return NextResponse.json({
        orders: result.orders,
        total: result.total,
        page,
        totalPages,
        paymentStatusCount,
      });
    }

    // Legacy: return all orders (backward compatible)
    const allOrders = getAllOrders();

    // Bug #5: Only show orders that have payment_id (QRIS generated) OR are cancelled/expired
    const validOrders = allOrders.filter((o) =>
      o.payment_id !== null ||
      o.order_status === "cancelled" ||
      o.payment_status === "expired"
    );

    let filtered = validOrders;
    if (paymentStatusFilter === "pending") {
      filtered = validOrders.filter((o) => o.payment_status === "pending" && o.payment_id !== null);
    } else if (paymentStatusFilter === "success") {
      filtered = validOrders.filter((o) => o.payment_status === "success");
    } else if (paymentStatusFilter === "cancelled") {
      filtered = validOrders.filter((o) => o.order_status === "cancelled" || o.payment_status === "expired");
    } else if (paymentStatusFilter !== "all") {
      filtered = validOrders.filter((o) => o.payment_status === paymentStatusFilter);
    }

    // Count per payment status
    const paymentStatusCount = {
      all: validOrders.length,
      pending: validOrders.filter((o) => o.payment_status === "pending" && o.payment_id !== null).length,
      success: validOrders.filter((o) => o.payment_status === "success").length,
      cancelled: validOrders.filter((o) => o.order_status === "cancelled" || o.payment_status === "expired").length,
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
