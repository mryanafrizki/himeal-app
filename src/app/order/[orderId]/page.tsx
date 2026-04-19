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
        try {
          const queueRes = await fetch(`/api/order/${orderId}`);
          const queueData = await queueRes.json();
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
          <p className="text-on-surface-variant">Pesanan tidak ditemukan</p>
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
    <div className="font-body selection:bg-primary-container selection:text-on-primary-container">
      {/* TopAppBar */}
      <header className="bg-[#10150f]/80 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-[#414942]/15">
        <div className="flex justify-between items-center px-6 h-20 w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="hover:opacity-80 transition-opacity active:scale-95 duration-200"
            >
              <span className="material-symbols-outlined text-[#9dd3aa]">arrow_back</span>
            </button>
            <div className="flex flex-col">
              <h1 className="font-headline tracking-tight font-bold text-lg text-[#9dd3aa]">Status Pesanan</h1>
              <span className="font-label text-[10px] tracking-wider text-on-surface-variant opacity-70">Order #{orderId}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-32 px-6 max-w-2xl mx-auto space-y-8">
        {/* Status Tracker */}
        <OrderTracker
          currentStatus={order.order_status}
          estimatedMinutes={estimatedMinutes ?? undefined}
        />

        {/* Order Summary Card */}
        <section className="bg-[#111a11] rounded-3xl p-6 border border-outline-variant/10">
          <h4 className="font-headline font-bold text-lg mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            Ringkasan Pesanan
          </h4>
          <div className="space-y-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-surface-container overflow-hidden shrink-0">
                    <div className="w-full h-full bg-gradient-to-br from-primary-container/20 to-surface-container" />
                  </div>
                  <div>
                    <p className="font-headline font-bold text-on-surface">{item.product_name}</p>
                    <p className="text-sm text-on-surface-variant">x{item.quantity}</p>
                    {item.notes && (
                      <p className="text-xs text-on-surface-variant mt-0.5">{item.notes}</p>
                    )}
                  </div>
                </div>
                <span className="font-headline font-bold text-on-surface">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-outline-variant/15 flex justify-between items-center">
            <span className="font-label text-sm uppercase tracking-widest text-on-surface-variant">Total Pembayaran</span>
            <span className="font-headline text-2xl font-black text-primary">{formatCurrency(order.total)}</span>
          </div>
        </section>

        {/* Address */}
        <section className="bg-surface-container-low rounded-3xl p-5">
          <p className="text-[10px] uppercase font-label tracking-wider text-on-surface-variant mb-2">Alamat Pengantaran</p>
          <p className="font-headline font-bold text-on-surface">{order.customer_address}</p>
          <p className="text-sm text-on-surface-variant mt-1">{order.distance_km} km</p>
        </section>
      </main>

      {/* Bottom Action Area */}
      <footer className="fixed bottom-0 left-0 w-full bg-[#10150f]/90 backdrop-blur-2xl px-6 pt-4 pb-8 border-t border-[#414942]/15 z-50">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <WhatsAppButton
            message={`Halo HiMeal, saya ingin menanyakan pesanan ${orderId}`}
          />
          <button
            onClick={copyLink}
            className="w-full h-14 bg-transparent border border-outline-variant/30 rounded-full flex items-center justify-center gap-3 hover:bg-surface-container transition-colors active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-on-surface-variant">content_copy</span>
            <span className="font-headline font-bold text-on-surface">Salin Link</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
