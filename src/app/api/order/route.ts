import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { MENU_ITEMS } from "@/lib/constants";
import { calculateRoadDistance, calculateDeliveryFee } from "@/lib/delivery";
import { createOrder } from "@/lib/db";

interface OrderItemInput {
  productId: string;
  quantity: number;
  notes?: string;
}

interface CreateOrderBody {
  items: OrderItemInput[];
  address: string;
  lat: number;
  lng: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderBody = await request.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Items are required" },
        { status: 400 }
      );
    }

    if (!body.address || typeof body.address !== "string") {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    if (typeof body.lat !== "number" || typeof body.lng !== "number") {
      return NextResponse.json(
        { error: "Valid lat and lng are required" },
        { status: 400 }
      );
    }

    // Validate items against menu
    const validatedItems: Array<{
      productId: string;
      productName: string;
      price: number;
      quantity: number;
      notes: string | null;
    }> = [];

    for (const item of body.items) {
      const menuItem = MENU_ITEMS.find((m) => m.id === item.productId);
      if (!menuItem) {
        return NextResponse.json(
          { error: `Invalid product: ${item.productId}` },
          { status: 400 }
        );
      }
      if (!item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { error: `Invalid quantity for ${item.productId}` },
          { status: 400 }
        );
      }
      validatedItems.push({
        productId: menuItem.id,
        productName: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        notes: item.notes || null,
      });
    }

    // Calculate pricing
    const subtotal = validatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const distanceKm = await calculateRoadDistance(body.lat, body.lng);
    const roundedDistance = Math.round(distanceKm * 100) / 100;
    const deliveryFee = calculateDeliveryFee(distanceKm);
    const total = subtotal + deliveryFee;

    // Generate order
    const orderId = nanoid(10);

    const order = createOrder(
      {
        id: orderId,
        customer_address: body.address,
        customer_lat: body.lat,
        customer_lng: body.lng,
        distance_km: roundedDistance,
        delivery_fee: deliveryFee,
        subtotal,
        total,
        payment_id: null,
        payment_status: "pending",
        order_status: "pending_payment",
        qr_string: null,
        notes: null,
        expires_at: null,
      },
      validatedItems.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        product_name: item.productName,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
      }))
    );

    return NextResponse.json({
      orderId: order.id,
      subtotal,
      deliveryFee,
      total,
      distanceKm: roundedDistance,
    });
  } catch (error) {
    console.error("[POST /api/order]", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
