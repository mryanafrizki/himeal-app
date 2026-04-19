"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  formatCurrency,
  ORDER_STATUS_LABELS,
  PREP_TIME_MINUTES,
  AVG_DELIVERY_SPEED_KMH,
  type OrderStatus,
} from "@/lib/constants";
import OrderTracker from "@/components/OrderTracker";
import WhatsAppButton from "@/components/WhatsAppButton";

interface OrderData {
  id: string;
  customer_address: string;
  distance_km: number;
  delivery_fee: number;
  subtotal: number;
  total: number;
  order_status: OrderStatus;
  payment_status: string;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
    price: number;
    notes: string | null;
  }>;
}

interface QueueData {
  position: number;
  activeOrders: number;
}

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/order/${orderId}`);
      if (!res.ok) {
        toast.error("Pesanan tidak ditemukan");
        router.replace("/");
        return;
      }
      const data: OrderData = await res.json();
      setOrder(data);

      // Calculate estimated time
      if (
        data.order_status === "confirmed" ||
        data.order_status === "preparing"
      ) {
        // Fetch queue position
        try {
          const queueRes = await fetch(`/api/order/${orderId}`);
          const queueData = await queueRes.json();
          // Estimate: queue position * prep time + delivery time
          const deliveryTimeMin =
            (data.distance_km / AVG_DELIVERY_SPEED_KMH) * 60;
          const prepTime = PREP_TIME_MINUTES;
          setEstimatedMinutes(Math.ceil(prepTime + deliveryTimeMin));
        } catch {
          setEstimatedMinutes(null);
        }
      } else if (data.order_status === "delivering") {
        const deliveryTimeMin =
          (data.distance_km / AVG_DELIVERY_SPEED_KMH) * 60;
        setEstimatedMinutes(Math.ceil(deliveryTimeMin));
      } else {
        setEstimatedMinutes(null);
      }

      // Stop polling if delivered or cancelled
      if (
        data.order_status === "delivered" ||
        data.order_status === "cancelled"
      ) {
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch {
      toast.error("Gagal memuat data pesanan");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Poll for status updates
  useEffect(() => {
    pollingRef.current = setInterval(fetchOrder, 10000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchOrder]);

  const copyLink = () => {
    const url = `${window.location.origin}/order/${orderId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link disalin");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Pesanan tidak ditemukan</p>
          <button
            onClick={() => router.replace("/")}
            className="text-primary underline text-sm"
          >
            Kembali ke menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-[#4a7c59]/10">
        <div className="max-w-lg mx-auto px-5 py-4">
          <h1 className="text-xl font-extrabold font-['Manrope'] tracking-tight text-center">
            Status Pesanan
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#c1c9bf] text-center mt-1">
            {orderId}
          </p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-5">
        {/* Status Tracker */}
        <OrderTracker
          currentStatus={order.order_status}
          estimatedMinutes={estimatedMinutes ?? undefined}
        />

        {/* Estimated Time */}
        {estimatedMinutes !== null && (
          <div className="bg-[#1c211b] rounded-2xl p-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#c1c9bf]">Estimasi</p>
            <p className="text-2xl font-black font-['Manrope'] text-[#9dd3aa] mt-1">
              ~{estimatedMinutes} menit
            </p>
          </div>
        )}

        {/* Order Summary */}
        <div className="space-y-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#c1c9bf]">
            Detail Pesanan
          </p>
          <div className="bg-[#1c211b] rounded-2xl divide-y divide-[#414942]/30">
            {order.items.map((item, i) => (
              <div key={i} className="p-5 flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm font-bold font-['Manrope'] text-foreground">
                    {item.product_name} x{item.quantity}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-[#c1c9bf] mt-1">
                      {item.notes}
                    </p>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground ml-4">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
            <div className="p-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#c1c9bf]">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#c1c9bf]">Ongkir</span>
                <span
                  className={
                    order.delivery_fee === 0 ? "text-[#9dd3aa]" : "text-foreground"
                  }
                >
                  {order.delivery_fee === 0
                    ? "GRATIS"
                    : formatCurrency(order.delivery_fee)}
                </span>
              </div>
              <div className="border-t border-[#414942]/30 pt-3 flex justify-between items-center">
                <span className="font-bold font-['Manrope']">Total</span>
                <span className="text-xl font-black font-['Manrope'] text-[#9dd3aa]">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-[#1c211b] rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#c1c9bf] mb-2">
            Alamat Pengantaran
          </p>
          <p className="text-sm text-foreground">{order.customer_address}</p>
          <p className="text-xs text-[#c1c9bf] mt-1">
            {order.distance_km} km
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={copyLink}
            className="flex-1 py-4 rounded-full border border-[#4a7c59]/30 text-foreground text-xs font-extrabold uppercase tracking-widest hover:bg-[#1c211b] transition-colors"
          >
            Salin Link
          </button>
        </div>
      </div>

      {/* WhatsApp Button */}
      <WhatsAppButton
        message={`Halo HiMeal, saya ingin menanyakan pesanan ${orderId}`}
      />
    </main>
  );
}
