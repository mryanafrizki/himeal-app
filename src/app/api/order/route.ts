import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { calculateRoadDistance, calculateDeliveryFee, validateDeliveryDistance } from "@/lib/delivery";
import { createOrder, getActiveProducts, validateVoucher, applyVoucher } from "@/lib/db";

interface OrderItemInput {
  productId: string;
  quantity: number;
  notes?: string;
}

interface CreateOrderBody {
  items: OrderItemInput[];
  customerName: string;
  customerPhone: string;
  address: string;
  addressNotes?: string;
  lat?: number;
  lng?: number;
  voucherCode?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderBody = await request.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal satu menu" },
        { status: 400 }
      );
    }

    if (!body.customerName || typeof body.customerName !== "string") {
      return NextResponse.json(
        { error: "Nama pemesan wajib diisi" },
        { status: 400 }
      );
    }

    if (!body.customerPhone || typeof body.customerPhone !== "string") {
      return NextResponse.json(
        { error: "Nomor WhatsApp wajib diisi" },
        { status: 400 }
      );
    }

    if (!body.address || typeof body.address !== "string") {
      return NextResponse.json(
        { error: "Alamat wajib diisi" },
        { status: 400 }
      );
    }

    // Validate items against DB products
    const activeProducts = getActiveProducts();
    const validatedItems: Array<{
      productId: string;
      productName: string;
      price: number;
      quantity: number;
      notes: string | null;
    }> = [];

    for (const item of body.items) {
      const menuItem = activeProducts.find((m) => m.id === item.productId);
      if (!menuItem) {
        return NextResponse.json(
          { error: `Produk tidak valid: ${item.productId}` },
          { status: 400 }
        );
      }
      if (menuItem.is_out_of_stock) {
        return NextResponse.json(
          { error: `${menuItem.name} sedang habis` },
          { status: 400 }
        );
      }
      if (!item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { error: `Jumlah tidak valid untuk ${menuItem.name}` },
          { status: 400 }
        );
      }
      if (menuItem.max_order_qty > 0 && item.quantity > menuItem.max_order_qty) {
        return NextResponse.json(
          { error: `Maksimal pemesanan ${menuItem.name} adalah ${menuItem.max_order_qty} porsi` },
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

    // Calculate distance if lat/lng provided
    let distanceKm = 0;
    let deliveryFee = 0;
    const hasCoords =
      typeof body.lat === "number" && typeof body.lng === "number";

    if (hasCoords) {
      try {
        distanceKm = await calculateRoadDistance(body.lat!, body.lng!);
        distanceKm = Math.round(distanceKm * 100) / 100;
        validateDeliveryDistance(distanceKm);
        deliveryFee = calculateDeliveryFee(distanceKm);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Gagal menghitung jarak. Coba lagi.";
        return NextResponse.json(
          { error: message },
          { status: 400 }
        );
      }
    }

    // Voucher handling
    let voucherId: string | null = null;
    let voucherDiscount = 0;

    if (body.voucherCode && typeof body.voucherCode === "string") {
      const voucherResult = validateVoucher(body.voucherCode, subtotal);
      if (!voucherResult.valid) {
        return NextResponse.json(
          { error: voucherResult.error },
          { status: 400 }
        );
      }
      voucherId = voucherResult.voucher!.id;
      voucherDiscount = voucherResult.discount!;
    }

    const total = subtotal - voucherDiscount + deliveryFee;

    // Generate order
    const orderId = nanoid(10);

    const order = createOrder(
      {
        id: orderId,
        customer_name: body.customerName.trim(),
        customer_phone: body.customerPhone.trim(),
        customer_address: body.address,
        customer_lat: hasCoords ? body.lat! : null,
        customer_lng: hasCoords ? body.lng! : null,
        address_notes: body.addressNotes?.trim() || null,
        distance_km: distanceKm,
        delivery_fee: deliveryFee,
        subtotal,
        total,
        payment_id: null,
        payment_status: "pending",
        order_status: "pending_payment",
        qr_string: null,
        notes: null,
        unique_code: 0,
        qris_fee: 0,
        voucher_id: voucherId,
        voucher_discount: voucherDiscount,
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

    // Apply voucher (increment used_count) after order is created
    if (voucherId) {
      applyVoucher(voucherId);
    }

    return NextResponse.json({
      orderId: order.id,
      subtotal,
      deliveryFee,
      voucherDiscount,
      total,
      distanceKm,
    });
  } catch (error) {
    console.error("[POST /api/order]", error);
    return NextResponse.json(
      { error: "Gagal membuat pesanan" },
      { status: 500 }
    );
  }
}
