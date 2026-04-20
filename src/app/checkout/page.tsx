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
  customerName: string;
  customerPhone: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  distanceKm: number;
  address: string;
  addressNotes?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [data, setData] = useState<CheckoutData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("himeal_checkout");
    if (!stored) {
      router.replace("/");
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setData(parsed);
      setEditName(parsed.customerName || "");
      setEditPhone(parsed.customerPhone || "");
      setEditAddress(parsed.address || "");
    } catch {
      router.replace("/");
    }
  }, [router]);

  const saveField = (field: string) => {
    if (!data) return;
    const updated = { ...data };
    if (field === "name") updated.customerName = editName.trim();
    if (field === "phone") updated.customerPhone = editPhone.trim();
    if (field === "address") updated.address = editAddress.trim();
    setData(updated);
    sessionStorage.setItem("himeal_checkout", JSON.stringify(updated));
    // Also update customer data in sessionStorage so going back preserves it
    try {
      const savedCustomer = sessionStorage.getItem("himeal_customer");
      if (savedCustomer) {
        const c = JSON.parse(savedCustomer);
        if (field === "name") c.customerName = updated.customerName;
        if (field === "phone") c.customerPhone = updated.customerPhone;
        if (field === "address") c.address = updated.address;
        sessionStorage.setItem("himeal_customer", JSON.stringify(c));
      }
    } catch { /* ignore */ }
    setEditingField(null);
    toast.success("Data diperbarui");
  };

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
    <>
      {/* TopAppBar */}
      <header className="bg-[#0C1410]/80 backdrop-blur-xl fixed top-0 w-full z-50 border-none">
        <div className="flex justify-between items-center w-full px-8 py-6 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-primary hover:opacity-80 transition-opacity active:scale-95 duration-200"
            >
              <span className="material-symbols-outlined text-primary text-3xl">eco</span>
            </button>
            <h1 className="font-['Manrope'] tracking-tighter font-bold uppercase text-primary text-xl">Ringkasan Pesanan</h1>
          </div>
          <div className="text-3xl font-black text-primary tracking-[-0.04em]">HiMeal</div>
        </div>
      </header>

      <main className="flex-grow pt-32 px-6 max-w-3xl mx-auto w-full">
        {/* Customer Info - Inline Editable */}
        <section className="mb-10 animate-fade-in-up">
          <h2 className="font-headline text-on-surface-variant text-xs uppercase tracking-widest mb-4">Pemesan</h2>
          <div className="botanical-card rounded-xl p-6 space-y-3">
            {/* Name */}
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              {editingField === "name" ? (
                <div className="flex-1 flex gap-2">
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 px-3 py-1.5 bg-surface-container border-none rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary" autoFocus />
                  <button onClick={() => saveField("name")} className="text-primary text-xs font-bold uppercase">Simpan</button>
                  <button onClick={() => setEditingField(null)} className="text-on-surface-variant text-xs uppercase">Batal</button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between">
                  <p className="font-headline font-bold text-on-surface">{data.customerName}</p>
                  <button onClick={() => { setEditName(data.customerName); setEditingField("name"); }} className="text-primary text-xs font-bold uppercase tracking-wider hover:opacity-80">Ubah</button>
                </div>
              )}
            </div>
            {/* Phone */}
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>phone</span>
              {editingField === "phone" ? (
                <div className="flex-1 flex gap-2">
                  <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="flex-1 px-3 py-1.5 bg-surface-container border-none rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary" autoFocus />
                  <button onClick={() => saveField("phone")} className="text-primary text-xs font-bold uppercase">Simpan</button>
                  <button onClick={() => setEditingField(null)} className="text-on-surface-variant text-xs uppercase">Batal</button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between">
                  <p className="text-on-surface-variant text-sm">{data.customerPhone}</p>
                  <button onClick={() => { setEditPhone(data.customerPhone); setEditingField("phone"); }} className="text-primary text-xs font-bold uppercase tracking-wider hover:opacity-80">Ubah</button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Delivery Address Card - Inline Editable */}
        <section className="mb-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h2 className="font-headline text-on-surface-variant text-xs uppercase tracking-widest mb-4">Alamat Pengantaran</h2>
          <div className="botanical-card rounded-xl p-6 flex items-start gap-5">
            <div className="bg-primary-container/20 p-3 rounded-full shrink-0">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            </div>
            <div className="flex-grow">
              {editingField === "address" ? (
                <div className="space-y-2">
                  <textarea value={editAddress} onChange={(e) => setEditAddress(e.target.value)} rows={2} className="w-full px-3 py-2 bg-surface-container border-none rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary resize-none" autoFocus />
                  <div className="flex gap-2">
                    <button onClick={() => saveField("address")} className="text-primary text-xs font-bold uppercase">Simpan</button>
                    <button onClick={() => setEditingField(null)} className="text-on-surface-variant text-xs uppercase">Batal</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-headline font-bold text-lg text-on-surface">{data.address}</p>
                  {data.addressNotes && (
                    <p className="text-on-surface-variant text-sm mt-1">{data.addressNotes}</p>
                  )}
                  {data.distanceKm > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-on-surface-variant text-sm">{data.distanceKm} km via jalan</span>
                    </div>
                  )}
                </>
              )}
            </div>
            {editingField !== "address" && (
              <button
                onClick={() => { setEditAddress(data.address); setEditingField("address"); }}
                className="text-primary font-headline font-bold text-xs uppercase tracking-wider hover:opacity-80 transition-opacity shrink-0"
              >
                Ubah
              </button>
            )}
          </div>
        </section>

        {/* Order Items */}
        <section className="mb-10">
          <h2 className="font-headline text-on-surface-variant text-xs uppercase tracking-widest mb-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>Your Selection</h2>
          <div className="space-y-4">
            {data.items.map((item, i) => (
              <div key={i} className="botanical-card rounded-xl overflow-hidden flex items-center p-4 gap-6 group animate-slide-in-right" style={{ animationDelay: `${300 + i * 100}ms` }}>
                <div className="relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container">
                  <div className="h-full w-full bg-gradient-to-br from-primary-container/20 to-surface-container" />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-headline font-bold text-lg text-on-surface">{item.name}</h3>
                      <p className="text-on-surface-variant text-sm font-medium">
                        {item.notes || "Standard preparation"}
                      </p>
                    </div>
                    <span className="font-headline font-bold text-on-surface">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                  <div className="mt-2 flex items-center text-primary-fixed-dim text-xs font-bold uppercase tracking-tighter">
                    <span>Qty: {item.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Add More Items Button */}
        <section className="mb-10">
          <button
            onClick={() => router.push("/")}
            className="w-full flex items-center justify-center gap-2 py-4 bg-surface-container rounded-2xl text-sm font-semibold text-primary hover:bg-surface-container-high transition-colors active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            Tambah Menu Lagi
          </button>
        </section>

        {/* Pricing Summary Card */}
        <section className="mb-20 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <div className="botanical-card rounded-xl p-8 space-y-4">
            <div className="flex justify-between items-center text-on-surface-variant">
              <span className="font-label text-sm uppercase tracking-wider">Subtotal</span>
              <span className="font-headline font-medium text-on-surface">{formatCurrency(data.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-label text-sm uppercase tracking-wider text-on-surface-variant">Ongkir (Shipping)</span>
              <span className="font-headline font-bold text-primary-container uppercase">
                {data.deliveryFee === 0 ? "GRATIS" : formatCurrency(data.deliveryFee)}
              </span>
            </div>
            <div className="pt-6 border-t border-outline-variant/30 flex justify-between items-end">
              <div>
                <span className="font-label text-xs uppercase tracking-[0.2em] text-on-surface-variant block mb-1">Total Amount</span>
                <span className="font-headline font-black text-4xl text-primary tracking-tighter animate-fade-in-up" style={{ animationDelay: '700ms' }}>{formatCurrency(data.total)}</span>
              </div>
              <div className="text-right">
                <span className="text-on-surface-variant text-[10px] uppercase tracking-widest block">Incl. Tax (11%)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Payment CTA */}
        <section className="fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur-md p-6 border-t border-outline-variant/10 z-50">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-extrabold text-lg py-5 rounded-full shadow-[0_20px_40px_rgba(91,219,111,0.2)] hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              {isProcessing ? "Memproses..." : "Bayar Sekarang"}
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low rounded-t-[2rem] mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 py-16 w-full max-w-screen-2xl mx-auto">
          <div className="flex flex-col items-center md:items-start mb-8 md:mb-0">
            <div className="text-lg font-bold text-primary mb-2">HiMeal</div>
            <p className="font-['Inter'] text-sm tracking-wide uppercase text-outline-variant">&copy; {new Date().getFullYear()} HiMeal. Good food, good mood.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <span className="font-['Inter'] text-sm tracking-wide uppercase text-outline-variant hover:text-primary transition-opacity opacity-80 hover:opacity-100 cursor-pointer">Sourcing</span>
            <span className="font-['Inter'] text-sm tracking-wide uppercase text-outline-variant hover:text-primary transition-opacity opacity-80 hover:opacity-100 cursor-pointer">The Vault</span>
            <span className="font-['Inter'] text-sm tracking-wide uppercase text-outline-variant hover:text-primary transition-opacity opacity-80 hover:opacity-100 cursor-pointer">Nutrition</span>
            <span className="font-['Inter'] text-sm tracking-wide uppercase text-outline-variant hover:text-primary transition-opacity opacity-80 hover:opacity-100 cursor-pointer">Privacy</span>
          </div>
        </div>
      </footer>
    </>
  );
}
