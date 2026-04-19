"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MENU_ITEMS, formatCurrency } from "@/lib/constants";
import {
  calculateDistanceFromHiMeal,
  calculateDeliveryFee,
} from "@/lib/delivery";
import MenuCard from "@/components/MenuCard";
import AddressSearch from "@/components/AddressSearch";
import dynamic from "next/dynamic";
import CartSummary from "@/components/CartSummary";

const DeliveryMap = dynamic(() => import("@/components/DeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] rounded-xl bg-surface-container animate-pulse" />
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
    (addr: string, lat: number, lng: number) => {
      setAddress(addr);
      setSelectedLat(lat);
      setSelectedLng(lng);
      const dist = calculateDistanceFromHiMeal(lat, lng);
      const fee = calculateDeliveryFee(dist);
      setDistanceKm(Math.round(dist * 100) / 100);
      setDeliveryFee(fee);
    },
    []
  );

  const handleMapSelect = useCallback(async (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    const dist = calculateDistanceFromHiMeal(lat, lng);
    const fee = calculateDeliveryFee(dist);
    setDistanceKm(Math.round(dist * 100) / 100);
    setDeliveryFee(fee);

    // Reverse geocode to get address from map click
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

      // Store checkout data for the checkout page
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

      // Track order ownership
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

  return (
    <main className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-[#4a7c59]/10">
        <div className="max-w-lg mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-[#9dd3aa] tracking-[-0.04em] uppercase font-['Manrope']">
                HI MEAL!
              </h1>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#c1c9bf]">
                Good food, good mood
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative h-48 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#4a7c59]/20 via-[#10150f]/60 to-[#10150f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(74,124,89,0.15)_0%,_transparent_70%)]" />
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-sm font-medium text-[#c1c9bf]">Healthy food delivery</p>
          <p className="text-xs text-[#c1c9bf]/60 mt-1">Purwokerto</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-8">
        {/* Menu Section */}
        <section>
          <h2 className="text-2xl font-extrabold font-['Manrope'] tracking-tight text-foreground mb-5">
            Menu
          </h2>
          <div className="space-y-4">
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
        <section>
          <h2 className="text-2xl font-extrabold font-['Manrope'] tracking-tight text-foreground mb-5">
            Pengantaran
          </h2>

          <div className="space-y-4">
            <AddressSearch value={address} onChange={handleAddressSelect} />

            <div className="rounded-2xl overflow-hidden">
              <DeliveryMap
                onLocationSelect={handleMapSelect}
                selectedLat={selectedLat}
                selectedLng={selectedLng}
              />
            </div>

            {distanceKm !== null && (
              <div className="flex items-center justify-between bg-[#111a11] border border-[#4a7c59]/30 rounded-2xl p-5">
                <div>
                  <p className="text-xs text-[#c1c9bf]">Jarak</p>
                  <p className="text-foreground font-bold font-['Manrope'] text-lg">
                    {distanceKm} km
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#c1c9bf]">Ongkir</p>
                  <p
                    className={`font-bold font-['Manrope'] text-lg ${deliveryFee === 0 ? "text-[#9dd3aa]" : "text-foreground"}`}
                  >
                    {deliveryFee === 0 ? "GRATIS" : formatCurrency(deliveryFee)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Cart Summary */}
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
    </main>
  );
}
