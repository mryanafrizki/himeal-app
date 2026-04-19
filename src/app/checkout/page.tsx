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
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-[#4a7c59]/10">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#1c211b] flex items-center justify-center text-foreground hover:bg-[#313630] transition-colors"
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
          <h1 className="text-xl font-extrabold font-['Manrope'] tracking-tight">
            Ringkasan Pesanan
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-5">
        {/* Address */}
        <div className="bg-[#1c211b] rounded-2xl p-5 space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#c1c9bf]">
            Alamat Pengantaran
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {data.address}
          </p>
          <p className="text-xs text-[#c1c9bf]">
            {data.distanceKm} km dari HiMeal
          </p>
        </div>

        {/* Items */}
        <div className="space-y-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#c1c9bf]">
            Pesanan
          </p>
          <div className="bg-[#1c211b] rounded-2xl divide-y divide-[#414942]/30">
            {data.items.map((item, i) => (
              <div key={i} className="p-5 flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm font-bold font-['Manrope'] text-foreground">
                    {item.name} x{item.quantity}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-[#c1c9bf] mt-1">
                      Catatan: {item.notes}
                    </p>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground ml-4">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-[#1c211b] rounded-2xl p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[#c1c9bf]">Subtotal</span>
            <span className="text-foreground">
              {formatCurrency(data.subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#c1c9bf]">Ongkir</span>
            <span
              className={
                data.deliveryFee === 0 ? "text-[#9dd3aa]" : "text-foreground"
              }
            >
              {data.deliveryFee === 0
                ? "GRATIS"
                : formatCurrency(data.deliveryFee)}
            </span>
          </div>
          <div className="border-t border-[#414942]/30 pt-4 flex justify-between items-center">
            <span className="font-bold font-['Manrope'] text-foreground">Total</span>
            <span className="text-xl font-black font-['Manrope'] text-[#9dd3aa]">
              {formatCurrency(data.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Pay Button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-gradient-to-t from-[#10150f] via-[#10150f]/95 to-transparent">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full py-4 rounded-full bg-gradient-to-r from-[#4a7c59] to-[#3a6c49] text-white font-extrabold text-sm uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
          >
            {isProcessing ? "Memproses..." : "Bayar Sekarang"}
          </button>
        </div>
      </div>
    </main>
  );
}
