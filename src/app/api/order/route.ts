import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { calculateRoadDistance, calculateDeliveryFee, validateDeliveryDistance } from "@/lib/delivery";
import { createOrder, getActiveProducts, validateVoucher, getAddonsByIds, createOrderItemAddons, getEffectivePrice } from "@/lib/db";

interface AddonInput {
  addonId: string;
  quantity: number;
}

interface OrderItemInput {
  productId: string;
  quantity: number;
  notes?: string;
  addons?: AddonInput[];
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
      originalPrice: number;
      hpp: number;
      quantity: number;
      notes: string | null;
      validatedAddons: Array<{ addonId: string; addonName: string; addonPrice: number; quantity: number }>;
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

      // Validate addons
      const validatedAddons: Array<{ addonId: string; addonName: string; addonPrice: number; quantity: number }> = [];
      if (item.addons && Array.isArray(item.addons) && item.addons.length > 0) {
        const addonIds = item.addons.map((a) => a.addonId);
        const dbAddons = getAddonsByIds(addonIds);

        for (const addonInput of item.addons) {
          const dbAddon = dbAddons.find((a) => a.id === addonInput.addonId);
          if (!dbAddon) {
            return NextResponse.json(
              { error: `Add-on tidak valid: ${addonInput.addonId}` },
              { status: 400 }
            );
          }
          if (dbAddon.product_id !== item.productId) {
            return NextResponse.json(
              { error: `Add-on ${dbAddon.name} bukan milik produk ${menuItem.name}` },
              { status: 400 }
            );
          }
          if (!dbAddon.is_active) {
            return NextResponse.json(
              { error: `Add-on ${dbAddon.name} tidak tersedia` },
              { status: 400 }
            );
          }
          const addonQty = addonInput.quantity || 1;
          if (addonQty < 1) {
            return NextResponse.json(
              { error: `Jumlah add-on tidak valid untuk ${dbAddon.name}` },
              { status: 400 }
            );
          }
          validatedAddons.push({
            addonId: dbAddon.id,
            addonName: dbAddon.name,
            addonPrice: dbAddon.price,
            quantity: addonQty,
          });
        }
      }

      const effectivePrice = getEffectivePrice(menuItem);
      const originalPrice = menuItem.price;
      const productHpp = menuItem.hpp || 0;

      validatedItems.push({
        productId: menuItem.id,
        productName: menuItem.name,
        price: effectivePrice,
        originalPrice,
        hpp: productHpp,
        quantity: item.quantity,
        notes: item.notes || null,
        validatedAddons,
      });
    }

    // Calculate pricing (item price + addon totals)
    const subtotal = validatedItems.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const addonTotal = item.validatedAddons.reduce(
        (aSum, a) => aSum + a.addonPrice * a.quantity * item.quantity,
        0
      );
      return sum + itemTotal + addonTotal;
    }, 0);

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
    let voucherCode: string | null = null;
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
      voucherCode = voucherResult.voucher!.code;
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
        voucher_code: voucherCode,
        voucher_discount: voucherDiscount,
        expires_at: null,
        confirmed_at: null,
        preparing_at: null,
        ready_at: null,
        delivering_at: null,
        delivered_at: null,
        telegram_message_id: null,
      },
      validatedItems.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        product_name: item.productName,
        price: item.price,
        original_price: item.originalPrice,
        hpp: item.hpp,
        quantity: item.quantity,
        notes: item.notes,
      }))
    );

    // Insert order item addons
    if (order.items.length > 0) {
      for (let i = 0; i < validatedItems.length; i++) {
        const vItem = validatedItems[i];
        if (vItem.validatedAddons.length > 0) {
          // Match by index — items are inserted in same order
          const orderItem = order.items[i];
          if (orderItem) {
            createOrderItemAddons(
              orderItem.id,
              vItem.validatedAddons.map((a) => ({
                addon_name: a.addonName,
                addon_price: a.addonPrice,
                quantity: a.quantity,
              }))
            );
          }
        }
      }
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
