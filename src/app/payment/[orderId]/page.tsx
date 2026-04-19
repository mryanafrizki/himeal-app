"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import PaymentQR from "@/components/PaymentQR";
import CountdownTimer from "@/components/CountdownTimer";

interface OrderData {
  id: string;
  total: number;
  qr_string: string | null;
  expires_at: string | null;
  payment_status: string;
  order_status: string;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Check if this device created the order
  useEffect(() => {
    const createdOrders = JSON.parse(
      sessionStorage.getItem("himeal_created_orders") || "[]"
    );
    setIsOwner(createdOrders.includes(orderId));
  }, [orderId]);

  // Fetch order data
  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/order/${orderId}`);
      if (!res.ok) {
        toast.error("Pesanan tidak ditemukan");
        router.replace("/");
        return;
      }
      const data = await res.json();
      setOrder(data);

      // Mark this device as owner
      const createdOrders = JSON.parse(
        sessionStorage.getItem("himeal_created_orders") || "[]"
      );
      if (!createdOrders.includes(orderId)) {
        // Only first load from checkout flow sets ownership
        const fromCheckout = document.referrer.includes("/checkout");
        if (fromCheckout) {
          createdOrders.push(orderId);
          sessionStorage.setItem(
            "himeal_created_orders",
            JSON.stringify(createdOrders)
          );
          setIsOwner(true);
        }
      }

      if (data.payment_status === "success") {
        router.replace(`/order/${orderId}`);
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

  // Poll payment status
  useEffect(() => {
    if (!order || order.payment_status === "success" || expired) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status/${orderId}`);
        const data = await res.json();

        if (data.status === "success") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          toast.success("Pembayaran berhasil!");
          router.replace(`/order/${orderId}`);
        } else if (data.status === "expired") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setExpired(true);
          toast.error("Pembayaran kedaluwarsa");
        }
      } catch {
        // Silent fail on polling
      }
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [order, orderId, router, expired]);

  const handleExpire = useCallback(() => {
    setExpired(true);
    if (pollingRef.current) clearInterval(pollingRef.current);
    toast.error("Waktu pembayaran habis");
  }, []);

  const handleCancel = async () => {
    if (!isOwner) {
      toast.error("Hanya perangkat pembuat pesanan yang dapat membatalkan");
      return;
    }
    try {
      await fetch(`/api/order/${orderId}/cancel`, { method: "POST" });
      toast.success("Pesanan dibatalkan");
      router.replace("/");
    } catch {
      toast.error("Gagal membatalkan pesanan");
    }
  };

  const paymentUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/payment/${orderId}`
      : "";

  const copyLink = () => {
    navigator.clipboard.writeText(paymentUrl);
    toast.success("Link disalin");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order || !order.qr_string) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Data pembayaran tidak tersedia
          </p>
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
    <main className="min-h-screen pb-8">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-[#4a7c59]/10">
        <div className="max-w-lg mx-auto px-5 py-4">
          <h1 className="text-xl font-extrabold font-['Manrope'] tracking-tight text-center">
            Pembayaran
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-5">
        {/* QR Code */}
        {!expired ? (
          <div className="bg-[#1c211b] rounded-2xl p-8 flex flex-col items-center space-y-5">
            <PaymentQR
              qrString={order.qr_string}
              orderId={orderId}
              expiresAt={order.expires_at || ""}
            />

            {/* Countdown */}
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#c1c9bf] mb-2">
                Waktu tersisa
              </p>
              <CountdownTimer
                expiresAt={order.expires_at || ""}
                onExpire={handleExpire}
              />
            </div>

            {/* Total */}
            <div className="text-center">
              <p className="text-3xl font-black font-['Manrope'] text-[#9dd3aa]">
                {formatCurrency(order.total)}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#1c211b] rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-destructive"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <p className="text-foreground font-bold font-['Manrope']">
              Pembayaran Kedaluwarsa
            </p>
            <p className="text-sm text-[#c1c9bf]">
              Silakan buat pesanan baru
            </p>
            <button
              onClick={() => router.replace("/")}
              className="mt-4 px-8 py-4 rounded-full bg-[#4a7c59] text-white font-extrabold text-xs uppercase tracking-widest"
            >
              Pesan Lagi
            </button>
          </div>
        )}

        {/* Payment Link */}
        {!expired && (
          <div className="bg-[#1c211b] rounded-2xl p-5 space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#c1c9bf]">
              Link Pembayaran
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={paymentUrl}
                className="flex-1 text-xs bg-[#181d17] rounded-xl border-none p-3"
              />
              <button
                onClick={copyLink}
                className="shrink-0 px-5 py-3 rounded-xl bg-[#4a7c59] text-white text-xs font-bold"
              >
                Salin
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!expired && (
          <p className="text-center text-sm text-[#c1c9bf] px-4">
            Scan QR code menggunakan aplikasi e-wallet atau mobile banking
          </p>
        )}

        {/* Cancel Button - only for owner device */}
        {!expired && isOwner && (
          <div className="text-center pt-4">
            <button
              onClick={handleCancel}
              className="text-sm text-[#c1c9bf] hover:text-destructive transition-colors"
            >
              Batalkan Pesanan
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
