import { NextRequest, NextResponse } from "next/server";
import { getOrder, getReview, createReview } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const review = getReview(id);

    if (!review) {
      return NextResponse.json({ review: null });
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error("[GET /api/order/[id]/review]", error);
    return NextResponse.json(
      { error: "Failed to load review" },
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

    // Order must be delivered
    if (order.order_status !== "delivered") {
      return NextResponse.json(
        { error: "Hanya pesanan yang sudah selesai yang bisa diberi ulasan" },
        { status: 400 }
      );
    }

    // Check no existing review
    const existingReview = getReview(id);
    if (existingReview) {
      return NextResponse.json(
        { error: "Pesanan ini sudah memiliki ulasan" },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.rating || typeof body.rating !== "number" || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: "Rating harus antara 1-5" },
        { status: 400 }
      );
    }

    const review = createReview(id, body.rating, body.comment || undefined);

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/order/[id]/review]", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}
