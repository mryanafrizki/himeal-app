"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MENU_ITEMS, formatCurrency } from "@/lib/constants";
import {
  calculateRoadDistance,
  calculateDeliveryFee,
} from "@/lib/delivery";
import MenuCard from "@/components/MenuCard";
import AddressSearch from "@/components/AddressSearch";
import dynamic from "next/dynamic";
import CartSummary from "@/components/CartSummary";

const DeliveryMap = dynamic(() => import("@/components/DeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="h-44 rounded-3xl bg-surface-container animate-pulse" />
  ),
});

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
  const [address, setAddress] = useState("");
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

  const handleAddressSelect = useCallback(
    async (addr: string, lat: number, lng: number) => {
      setAddress(addr);
      setSelectedLat(lat);
      setSelectedLng(lng);
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
    },
    []
  );

  const handleMapSelect = useCallback(async (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
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

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "User-Agent": "HiMeal-App" } }
      );
      const data = await res.json();
      if (data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch {
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  }, []);

  const cartItems = Object.values(cart);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error("Pilih minimal satu menu");
      return;
    }
    if (!address || !selectedLat || !selectedLng) {
      toast.error("Tentukan alamat dan titik pengantaran di peta");
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
          address,
          lat: selectedLat,
          lng: selectedLng,
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
          subtotal: data.subtotal,
          deliveryFee: data.deliveryFee,
          total: data.total,
          distanceKm: data.distanceKm,
          address,
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
        <div className="flex justify-between items-center w-full px-8 py-6 max-w-screen-2xl mx-auto">
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

      <main className="px-6 space-y-10 pb-32">
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

        {/* Delivery Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-headline font-bold text-on-surface tracking-tight">Delivery Address</h3>

          <AddressSearch value={address} onChange={handleAddressSelect} />

          <div className="h-44 rounded-3xl overflow-hidden relative border border-outline-variant/20">
            <DeliveryMap
              onLocationSelect={handleMapSelect}
              selectedLat={selectedLat}
              selectedLng={selectedLng}
            />
          </div>

          {distanceKm !== null && (
            <div className="botanical-card rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-on-surface-variant">Jarak</p>
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
        </section>
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
          <p className="font-['Inter'] text-xs tracking-wide uppercase text-[#414942]">&copy; 2024 HiMeal. Good food, good mood.</p>
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
