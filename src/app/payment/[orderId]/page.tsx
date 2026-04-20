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
  const [failCount, setFailCount] = useState(0);
  const [timerUrgent, setTimerUrgent] = useState(false);

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

  // Check timer urgency
  useEffect(() => {
    if (!order?.expires_at) return;
    const check = () => {
      const remaining = new Date(order.expires_at!).getTime() - Date.now();
      setTimerUrgent(remaining < 120000 && remaining > 0);
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [order?.expires_at]);

  // Poll payment status
  useEffect(() => {
    if (!order || order.payment_status === "success" || expired) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status/${orderId}`);
        const data = await res.json();

        if (data.status === "success") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setFailCount(0);
          toast.success("Pembayaran berhasil!");
          router.replace(`/order/${orderId}`);
        } else if (data.status === "expired") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setFailCount(0);
          setExpired(true);
          toast.error("Pembayaran kedaluwarsa");
        } else {
          setFailCount(0);
        }
      } catch {
        setFailCount((prev) => prev + 1);
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
          <p className="text-on-surface-variant">
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
    <div className="font-body text-on-surface antialiased min-h-screen flex flex-col">
      {/* TopAppBar */}
      <nav className="bg-[#0C1410]/80 backdrop-blur-xl top-0 z-50 flex items-center justify-between px-6 py-4 w-full">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="active:scale-95 duration-200 hover:opacity-80 transition-opacity text-primary"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-['Manrope'] font-bold tracking-tight text-lg text-primary">Pembayaran</h1>
        </div>
      </nav>

      <main className="flex-grow flex flex-col items-center justify-start px-6 pt-8 pb-32 max-w-md mx-auto w-full">
        {!expired ? (
          <div className="w-full flex flex-col items-center gap-8">
            {/* Amount Display */}
            <div className="text-center animate-fade-in-up">
              <p className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant mb-1">Total Pembayaran</p>
              <h2 className="font-headline font-extrabold text-4xl tracking-tighter text-on-surface">{formatCurrency(order.total)}</h2>
            </div>

            {/* QR Code + Link */}
            <div className="animate-scale-in" style={{ animationDelay: '200ms' }}>
              <PaymentQR
                qrString={order.qr_string}
                orderId={orderId}
                expiresAt={order.expires_at || ""}
              />
            </div>

            {/* Timer */}
            <div className={timerUrgent ? "animate-pulse" : ""}>
              <CountdownTimer
                expiresAt={order.expires_at || ""}
                onExpire={handleExpire}
              />
            </div>

            {/* Instructions */}
            <div className="bg-surface-container rounded-2xl p-5 w-full text-center border border-outline-variant/10 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Scan QR code menggunakan aplikasi <span className="text-secondary font-semibold">e-wallet</span> atau <span className="text-secondary font-semibold">mobile banking</span> pilihan Anda.
              </p>
            </div>

            {/* WhatsApp fallback after 3 consecutive polling failures */}
            {failCount >= 3 && (
              <div className="bg-surface-container rounded-2xl p-5 w-full text-center border border-error/20 space-y-3 animate-fade-in-up">
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  Jika sudah membayar, silakan hubungi admin
                </p>
                <a
                  href={`https://wa.me/6287777527426?text=${encodeURIComponent(`Halo admin HiMeal, saya sudah bayar pesanan ${orderId} tapi status belum berubah. Mohon dicek.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-full text-sm font-bold hover:opacity-90 transition-opacity active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">chat</span>
                  Hubungi via WhatsApp
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-6 pt-8 animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-error text-3xl">cancel</span>
            </div>
            <div className="text-center">
              <p className="font-headline font-bold text-on-surface text-lg">Pembayaran Kedaluwarsa</p>
              <p className="text-sm text-on-surface-variant mt-2">Silakan buat pesanan baru</p>
            </div>
            <button
              onClick={() => router.replace("/")}
              className="mt-4 bg-primary-container text-on-primary-container px-8 py-4 rounded-full font-headline font-extrabold uppercase tracking-widest text-sm"
            >
              Pesan Lagi
            </button>
          </div>
        )}
      </main>

      {/* Footer Actions */}
      {!expired && isOwner && (
        <div className="fixed bottom-0 left-0 right-0 p-8 flex flex-col items-center max-w-md mx-auto">
          <button
            onClick={handleCancel}
            className="font-label text-sm text-outline hover:text-error transition-colors uppercase tracking-widest font-semibold active:scale-95 duration-200 py-4"
          >
            Batalkan Pesanan
          </button>
          <div className="h-4" />
        </div>
      )}
    </div>
  );
}
