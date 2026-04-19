"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MENU_ITEMS, formatCurrency, type OrderType } from "@/lib/constants";
import {
  calculateRoadDistance,
  calculateDeliveryFee,
} from "@/lib/delivery";
import MenuCard from "@/components/MenuCard";
import AddressSearch from "@/components/AddressSearch";
import CartSummary from "@/components/CartSummary";
import DeliveryMap from "@/components/DeliveryMap";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

export default function HomePage() {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressNotes, setAddressNotes] = useState("");
  const [selectedLat, setSelectedLat] = useState<number | undefined>();
  const [selectedLng, setSelectedLng] = useState<number | undefined>();
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) => {
      const item = MENU_ITEMS.find((m) => m.id === productId);
      if (!item) return prev;
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return {
        ...prev,
        [productId]: {
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity,
          notes: prev[productId]?.notes || "",
        },
      };
    });
  }, []);

  const updateNotes = useCallback((productId: string, notes: string) => {
    setCart((prev) => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: { ...prev[productId], notes },
      };
    });
  }, []);

  const recalcDistance = useCallback(async (lat: number, lng: number) => {
    try {
      const dist = await calculateRoadDistance(lat, lng);
      const fee = calculateDeliveryFee(dist);
      setDistanceKm(Math.round(dist * 100) / 100);
      setDeliveryFee(fee);
    } catch {
      toast.error("Gagal menghitung jarak. Coba lagi.");
      setDistanceKm(null);
      setDeliveryFee(0);
    }
  }, []);

  const handleAddressSelect = useCallback(
    async (addr: string, lat: number, lng: number) => {
      setAddress(addr);
      setSelectedLat(lat);
      setSelectedLng(lng);
      await recalcDistance(lat, lng);
    },
    [recalcDistance]
  );

  const handleMapSelect = useCallback(async (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    await recalcDistance(lat, lng);
  }, [recalcDistance]);

  const cartItems = Object.values(cart);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error("Pilih minimal satu menu");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Nama pemesan wajib diisi");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Nomor WhatsApp wajib diisi");
      return;
    }
    if (orderType === "delivery" && !address.trim()) {
      toast.error("Alamat pengantaran wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes || undefined,
          })),
          orderType,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          address: orderType === "delivery" ? address : "Takeaway - Ambil di lokasi HiMeal",
          addressNotes: addressNotes.trim() || undefined,
          lat: orderType === "delivery" ? selectedLat : undefined,
          lng: orderType === "delivery" ? selectedLng : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal membuat pesanan");
        return;
      }

      sessionStorage.setItem(
        "himeal_checkout",
        JSON.stringify({
          orderId: data.orderId,
          items: cartItems,
          orderType,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          subtotal: data.subtotal,
          deliveryFee: data.deliveryFee,
          total: data.total,
          distanceKm: data.distanceKm,
          address: orderType === "delivery" ? address : "Takeaway - Ambil di lokasi HiMeal",
          addressNotes: addressNotes.trim(),
        })
      );

      const createdOrders = JSON.parse(
        sessionStorage.getItem("himeal_created_orders") || "[]"
      );
      createdOrders.push(data.orderId);
      sessionStorage.setItem(
        "himeal_created_orders",
        JSON.stringify(createdOrders)
      );

      router.push("/checkout");
    } catch {
      toast.error("Terjadi kesalahan, coba lagi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());

  return (
    <>
      {/* Top Navigation Shell */}
      <header className="sticky top-0 z-50 bg-[#10150f]/80 backdrop-blur-xl border-none">
        <div className="flex justify-between items-center w-full px-6 lg:px-8 py-6 max-w-5xl mx-auto">
          <div className="flex flex-col">
            <span className="text-3xl font-black text-[#9dd3aa] tracking-[-0.04em] font-['Manrope'] uppercase">HI MEAL!</span>
            <span className="font-['Inter'] text-[10px] tracking-[0.2em] uppercase text-on-surface-variant font-medium">Good food, good mood</span>
          </div>
          <div className="flex gap-4">
            <button className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary transition-transform active:scale-95 duration-200">
              <span className="material-symbols-outlined">eco</span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 lg:px-8 space-y-10 pb-32 max-w-5xl mx-auto">
        {/* Hero Section */}
        <section className="mt-4">
          <div className="relative h-48 w-full rounded-3xl overflow-hidden bg-surface-container">
            <div className="w-full h-full bg-gradient-to-br from-primary-container/30 via-surface-container to-background" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6">
              <span className="text-xs font-label uppercase tracking-widest text-primary font-bold">Elite Performance Fuel</span>
              <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">Curated Nutrition.</h2>
            </div>
          </div>
        </section>

        {/* Content Grid - 2 cols on desktop */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 space-y-10 lg:space-y-0">

        {/* Menu Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h3 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight">Today&apos;s Menu</h3>
              <p className="text-sm text-on-surface-variant font-body">Chef-designed for maximum macro-efficiency.</p>
            </div>
            <span className="text-xs font-label uppercase tracking-widest text-on-secondary-container bg-secondary-container px-3 py-1 rounded-full">{dayName}</span>
          </div>
          <div className="grid gap-6">
            {MENU_ITEMS.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                quantity={cart[item.id]?.quantity || 0}
                notes={cart[item.id]?.notes || ""}
                onQuantityChange={(qty) => updateQuantity(item.id, qty)}
                onNotesChange={(notes) => updateNotes(item.id, notes)}
              />
            ))}
          </div>
        </section>

        {/* Customer & Order Type Section */}
        <section className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <h3 className="text-lg font-headline font-bold text-on-surface tracking-tight">Detail Pesanan</h3>

          {/* Order Type Toggle */}
          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Tipe Pesanan</label>
            <div className="flex gap-2 bg-surface-container rounded-2xl p-1.5">
              <button
                type="button"
                onClick={() => { setOrderType("delivery"); setDeliveryFee(0); setDistanceKm(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                  orderType === "delivery"
                    ? "bg-primary-container text-on-primary-container shadow-lg"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: orderType === "delivery" ? "'FILL' 1" : "'FILL' 0" }}>delivery_dining</span>
                Delivery
              </button>
              <button
                type="button"
                onClick={() => { setOrderType("takeaway"); setDeliveryFee(0); setDistanceKm(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                  orderType === "takeaway"
                    ? "bg-primary-container text-on-primary-container shadow-lg"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: orderType === "takeaway" ? "'FILL' 1" : "'FILL' 0" }}>shopping_bag</span>
                Takeaway
              </button>
            </div>
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Nama Pemesan *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary text-lg pointer-events-none">person</span>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama lengkap"
                className="w-full pl-12 pr-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary shadow-inner"
              />
            </div>
          </div>

          {/* Customer Phone */}
          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">No. WhatsApp *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary text-lg pointer-events-none">phone</span>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full pl-12 pr-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary shadow-inner"
              />
            </div>
          </div>

          {/* Delivery-specific fields */}
          {orderType === "delivery" && (
            <>
              {/* Address Search */}
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Alamat Lengkap *</label>
                <AddressSearch value={address} onChange={handleAddressSelect} />
              </div>

              {/* Address Notes */}
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Catatan Alamat</label>
                <div className="relative">
                  <span className="absolute left-4 top-4 material-symbols-outlined text-primary text-lg pointer-events-none">edit_note</span>
                  <textarea
                    value={addressNotes}
                    onChange={(e) => setAddressNotes(e.target.value)}
                    placeholder="Contoh: Taro di pager, rumah cat hijau, lantai 2"
                    rows={2}
                    className="w-full pl-12 pr-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary shadow-inner resize-none"
                  />
                </div>
              </div>

              {/* Share Location (Optional) */}
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Titik Lokasi (Opsional)</label>
                <DeliveryMap
                  onLocationSelect={handleMapSelect}
                  onLocationClear={() => {
                    setSelectedLat(undefined);
                    setSelectedLng(undefined);
                    setDistanceKm(null);
                    setDeliveryFee(0);
                  }}
                  selectedLat={selectedLat}
                  selectedLng={selectedLng}
                />
              </div>

              {/* Distance & Fee Info */}
              {distanceKm !== null && distanceKm > 0 && (
                <div className="botanical-card rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-on-surface-variant">Jarak (via jalan)</p>
                    <p className="font-headline font-bold text-lg text-on-surface">
                      {distanceKm} km
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-on-surface-variant">Ongkir</p>
                    <p
                      className={`font-headline font-bold text-lg ${deliveryFee === 0 ? "text-primary-container uppercase" : "text-on-surface"}`}
                    >
                      {deliveryFee === 0 ? "GRATIS" : formatCurrency(deliveryFee)}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Takeaway - show HiMeal location + catatan */}
          {orderType === "takeaway" && (
            <div className="space-y-4">
              <div className="botanical-card rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
                  <div>
                    <p className="font-headline font-bold text-on-surface">Ambil di Lokasi HiMeal</p>
                    <p className="text-sm text-on-surface-variant">Juple&apos;s House, Purwokerto</p>
                  </div>
                </div>
                <p className="text-xs text-primary-container font-semibold uppercase tracking-widest">Ongkir: GRATIS</p>
              </div>

              {/* Catatan Takeaway */}
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Catatan</label>
                <div className="relative">
                  <span className="absolute left-4 top-4 material-symbols-outlined text-primary text-lg pointer-events-none">edit_note</span>
                  <textarea
                    value={addressNotes}
                    onChange={(e) => setAddressNotes(e.target.value)}
                    placeholder="Contoh: Ambil jam 12 siang, minta extra sambal"
                    rows={2}
                    className="w-full pl-12 pr-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary shadow-inner resize-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-outline-variant/20" style={{ height: "200px" }}>
                <iframe
                  title="Lokasi HiMeal"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src="https://maps.google.com/maps?q=-7.434855,109.2237517&z=17&output=embed"
                />
              </div>
            </div>
          )}
        </section>

        </div>{/* end grid */}
      </main>

      {/* Footer Shell */}
      <footer className="bg-[#181d17] rounded-t-[2rem] mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 py-16 w-full gap-8">
          <div className="text-lg font-bold text-[#9dd3aa] font-headline uppercase tracking-widest">HI MEAL!</div>
          <div className="flex gap-6">
            <span className="font-['Inter'] text-sm tracking-wide uppercase text-[#414942] hover:text-[#9dd3aa] transition-opacity cursor-pointer">Sourcing</span>
            <span className="font-['Inter'] text-sm tracking-wide uppercase text-[#414942] hover:text-[#9dd3aa] transition-opacity cursor-pointer">The Vault</span>
            <span className="font-['Inter'] text-sm tracking-wide uppercase text-[#414942] hover:text-[#9dd3aa] transition-opacity cursor-pointer">Nutrition</span>
          </div>
          <p className="font-['Inter'] text-xs tracking-wide uppercase text-[#414942]">&copy; {new Date().getFullYear()} HiMeal. Good food, good mood.</p>
        </div>
      </footer>

      {/* Floating Cart Bar */}
      {cartItems.length > 0 && (
        <CartSummary
          items={cartItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes,
          }))}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          onCheckout={handleCheckout}
          isLoading={isSubmitting}
        />
      )}
    </>
  );
}
