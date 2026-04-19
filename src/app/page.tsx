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

  const handleMapSelect = useCallback((lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    const dist = calculateDistanceFromHiMeal(lat, lng);
    const fee = calculateDeliveryFee(dist);
    setDistanceKm(Math.round(dist * 100) / 100);
    setDeliveryFee(fee);
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
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-outline-variant/15">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
              <span className="text-primary text-sm font-bold">HM</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                HI MEAL!
              </h1>
              <p className="text-xs text-muted-foreground">
                Good food, good mood
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-8">
        {/* Menu Section */}
        <section>
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
            Menu
          </h2>
          <div className="space-y-3">
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
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
            Pengantaran
          </h2>

          <div className="space-y-4">
            <AddressSearch value={address} onChange={handleAddressSelect} />

            <div className="rounded-xl overflow-hidden h-[300px]">
              <DeliveryMap
                onLocationSelect={handleMapSelect}
                selectedLat={selectedLat}
                selectedLng={selectedLng}
              />
            </div>

            {distanceKm !== null && (
              <div className="flex items-center justify-between bg-surface-container rounded-xl p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Jarak</p>
                  <p className="text-foreground font-medium">
                    {distanceKm} km
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Ongkir</p>
                  <p
                    className={`font-medium ${deliveryFee === 0 ? "text-success" : "text-foreground"}`}
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
