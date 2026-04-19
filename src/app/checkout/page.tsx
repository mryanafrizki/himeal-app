"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";

interface CheckoutData {
  orderId: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    notes: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  distanceKm: number;
  address: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [data, setData] = useState<CheckoutData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("himeal_checkout");
    if (!stored) {
      router.replace("/");
      return;
    }
    try {
      setData(JSON.parse(stored));
    } catch {
      router.replace("/");
    }
  }, [router]);

  const handlePay = async () => {
    if (!data) return;
    setIsProcessing(true);

    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderId }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Gagal membuat pembayaran");
        return;
      }

      sessionStorage.removeItem("himeal_checkout");
      router.push(`/payment/${data.orderId}`);
    } catch {
      toast.error("Terjadi kesalahan, coba lagi");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-32">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-outline-variant/15">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-foreground hover:bg-surface-high transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold tracking-tight">
            Ringkasan Pesanan
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Address */}
        <div className="bg-surface-container rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Alamat Pengantaran
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {data.address}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.distanceKm} km dari HiMeal
          </p>
        </div>

        {/* Items */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Pesanan
          </p>
          <div className="bg-surface-container rounded-xl divide-y divide-outline-variant/15">
            {data.items.map((item, i) => (
              <div key={i} className="p-4 flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {item.name} x{item.quantity}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Catatan: {item.notes}
                    </p>
                  )}
                </div>
                <p className="text-sm text-foreground ml-4">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-surface-container rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">
              {formatCurrency(data.subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ongkir</span>
            <span
              className={
                data.deliveryFee === 0 ? "text-success" : "text-foreground"
              }
            >
              {data.deliveryFee === 0
                ? "GRATIS"
                : formatCurrency(data.deliveryFee)}
            </span>
          </div>
          <div className="border-t border-outline-variant/15 pt-3 flex justify-between">
            <span className="font-medium text-foreground">Total</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(data.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Pay Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-outline-variant/15 p-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full py-4 rounded-full bg-gradient-to-r from-primary to-primary-container text-primary-foreground font-semibold text-base transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Memproses..." : "Bayar Sekarang"}
          </button>
        </div>
      </div>
    </main>
  );
}
