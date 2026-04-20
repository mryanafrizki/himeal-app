"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency, DELIVERY_CONFIG, type OrderType, type MenuItem } from "@/lib/constants";
import {
  calculateRoadDistance,
  calculateDeliveryFee,
} from "@/lib/delivery";
import MenuCard, { type Addon } from "@/components/MenuCard";
// AddressSearch removed — using plain input
import StorePopup from "@/components/StorePopup";
import CartSummary from "@/components/CartSummary";
import DeliveryMap from "@/components/DeliveryMap";

interface AddonItem {
  id: string;
  name: string;
  price: number;
  qty?: number;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  addons: AddonItem[];
}

interface HeroSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
}

interface Partner {
  id: string;
  name: string;
  logo_url: string;
  link_url?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const menuItemsRef = useRef<MenuItem[]>([]);
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
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [saveData, setSaveData] = useState(false);

  // #5: Validation errors + refs
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);

  // #7: Hero slides
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const heroScrollRef = useRef<HTMLDivElement>(null);
  const heroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // #13: Partners
  const [partners, setPartners] = useState<Partner[]>([]);

  // Store status
  const [storeMode, setStoreMode] = useState<string>("open");
  const [storeOpen, setStoreOpen] = useState(true);
  const [storeMessage, setStoreMessage] = useState("");
  const [nextOpen, setNextOpen] = useState("");
  const [showInfoPopup, setShowInfoPopup] = useState(false);

  // FEAT-14: Restore saved customer data from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("himeal_saved_customer");
      if (saved) {
        const c = JSON.parse(saved);
        if (c.customerName) setCustomerName(c.customerName);
        if (c.customerPhone) setCustomerPhone(c.customerPhone);
        if (c.address) setAddress(c.address);
        if (c.addressNotes) setAddressNotes(c.addressNotes);
        setSaveData(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Restore cart and customer data from sessionStorage on mount
  useEffect(() => {
    try {
      const savedCart = sessionStorage.getItem("himeal_cart");
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (parsed && typeof parsed === "object") setCart(parsed);
      }
      const savedCustomer = sessionStorage.getItem("himeal_customer");
      if (savedCustomer) {
        const c = JSON.parse(savedCustomer);
        if (c.customerName) setCustomerName(c.customerName);
        if (c.customerPhone) setCustomerPhone(c.customerPhone);
        if (c.address) setAddress(c.address);
        if (c.addressNotes) setAddressNotes(c.addressNotes);
        if (typeof c.selectedLat === "number") setSelectedLat(c.selectedLat);
        if (typeof c.selectedLng === "number") setSelectedLng(c.selectedLng);
        if (typeof c.distanceKm === "number") setDistanceKm(c.distanceKm);
        if (typeof c.deliveryFee === "number") setDeliveryFee(c.deliveryFee);
        if (c.orderType) setOrderType(c.orderType);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist cart to sessionStorage on every change
  useEffect(() => {
    sessionStorage.setItem("himeal_cart", JSON.stringify(cart));
  }, [cart]);

  // Persist customer data to sessionStorage on every change
  useEffect(() => {
    sessionStorage.setItem("himeal_customer", JSON.stringify({
      customerName, customerPhone, address, addressNotes,
      selectedLat, selectedLng, distanceKm, deliveryFee, orderType,
    }));
  }, [customerName, customerPhone, address, addressNotes, selectedLat, selectedLng, distanceKm, deliveryFee, orderType]);

  // FEAT-14: Save/remove from localStorage when checkbox changes
  useEffect(() => {
    if (saveData) {
      localStorage.setItem("himeal_saved_customer", JSON.stringify({
        customerName, customerPhone, address, addressNotes,
      }));
    } else {
      localStorage.removeItem("himeal_saved_customer");
    }
  }, [saveData, customerName, customerPhone, address, addressNotes]);

  // Fetch products
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data: MenuItem[]) => {
        setMenuItems(data);
        menuItemsRef.current = data;
      })
      .catch(() => toast.error("Gagal memuat menu"))
      .finally(() => setMenuLoading(false));
  }, []);

  // Fetch store status
  useEffect(() => {
    fetch("/api/store/status")
      .then((res) => res.json())
      .then((data) => {
        setStoreMode(data.mode || "open");
        setStoreOpen(data.isOpen ?? true);
        if (data.mode === "maintenance") setStoreMessage(data.maintenanceMessage || "Sedang dalam perbaikan.");
        else if (data.mode === "info") setStoreMessage(data.infoMessage || "");
        else if (data.mode === "closed") setStoreMessage("Toko sedang tutup.");
        if (data.nextOpenDay && data.nextOpenTime) setNextOpen(`Buka ${data.nextOpenDay} ${data.nextOpenTime}`);
        // Show info popup if not dismissed today
        if (data.mode === "info" && data.infoMessage) {
          const dismissed = localStorage.getItem("himeal_info_dismissed");
          const today = new Date().toISOString().slice(0, 10);
          if (dismissed !== today) setShowInfoPopup(true);
        }
      })
      .catch(() => {});
  }, []);

  // Task 7: Fetch hero slides
  useEffect(() => {
    fetch("/api/hero-slides")
      .then((res) => res.ok ? res.json() : [])
      .then((data: HeroSlide[]) => {
        if (Array.isArray(data) && data.length > 0) setHeroSlides(data);
      })
      .catch(() => { /* fallback to static hero */ });
  }, []);

  // Task 7: Auto-advance hero slider
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    heroIntervalRef.current = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % heroSlides.length;
        const el = heroScrollRef.current;
        if (el) {
          el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
        }
        return next;
      });
    }, 4000);
    return () => { if (heroIntervalRef.current) clearInterval(heroIntervalRef.current); };
  }, [heroSlides.length]);

  // Task 7: Track scroll position for dots
  useEffect(() => {
    const el = heroScrollRef.current;
    if (!el || heroSlides.length <= 1) return;
    const handleScroll = () => {
      const scrollLeft = el.scrollLeft;
      const width = el.clientWidth;
      const idx = Math.round(scrollLeft / width);
      setActiveSlide(idx);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [heroSlides.length]);



  // Task 13: Fetch partners
  useEffect(() => {
    fetch("/api/partners")
      .then((res) => res.ok ? res.json() : [])
      .then((data: Partner[]) => {
        if (Array.isArray(data)) setPartners(data);
      })
      .catch(() => { /* ignore */ });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) => {
      const item = menuItemsRef.current.find((m) => m.id === productId) as MenuItem & { promo_price?: number | null; promo_end_date?: string | null } | undefined;
      if (!item) return prev;
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      // Use promo price if active
      const hasPromo = item.promo_price != null && item.promo_end_date && new Date(item.promo_end_date).getTime() > Date.now();
      const effectivePrice = hasPromo ? item.promo_price! : item.price;
      return {
        ...prev,
        [productId]: {
          productId: item.id,
          name: item.name,
          price: effectivePrice,
          quantity,
          image: item.image,
          addons: prev[productId]?.addons || [],
        },
      };
    });
  }, []);

  // #9: Update addons for a cart item
  const updateAddons = useCallback((productId: string, addons: Addon[]) => {
    setCart((prev) => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: { ...prev[productId], addons },
      };
    });
  }, []);

  // Update addon qty from cart summary
  const updateAddonQty = useCallback((productId: string, addonId: string, qty: number) => {
    setCart((prev) => {
      if (!prev[productId]) return prev;
      const item = prev[productId];
      let newAddons;
      if (qty <= 0) {
        newAddons = item.addons.filter((a) => a.id !== addonId);
      } else {
        newAddons = item.addons.map((a) => a.id === addonId ? { ...a, qty } : a);
      }
      return { ...prev, [productId]: { ...item, addons: newAddons } };
    });
  }, []);

  const recalcDistance = useCallback(async (lat: number, lng: number) => {
    try {
      const dist = await calculateRoadDistance(lat, lng);
      const roundedDist = Math.round(dist * 100) / 100;
      if (roundedDist > DELIVERY_CONFIG.maxDistanceKm) {
        setDistanceKm(roundedDist);
        setDeliveryFee(0);
        setDistanceError(`Jarak ${roundedDist} km melebihi batas maksimum ${DELIVERY_CONFIG.maxDistanceKm} km.`);
        return;
      }
      const fee = calculateDeliveryFee(dist);
      setDistanceKm(roundedDist);
      setDeliveryFee(fee);
      setDistanceError(null);
    } catch {
      toast.error("Gagal menghitung jarak. Coba lagi.");
      setDistanceKm(null);
      setDeliveryFee(0);
      setDistanceError(null);
    }
  }, []);

  const handleAddressSelect = useCallback(
    async (addr: string, lat: number | null, lng: number | null) => {
      setAddress(addr);
      if (lat !== null && lng !== null) {
        setSelectedLat(lat);
        setSelectedLng(lng);
        await recalcDistance(lat, lng);
      } else {
        setSelectedLat(undefined);
        setSelectedLng(undefined);
        setDistanceKm(null);
        setDeliveryFee(0);
      }
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
    (sum, item) => {
      const addonTotal = item.addons.reduce((a, ad) => a + ad.price * (ad.qty || 1), 0);
      return sum + (item.price + addonTotal) * item.quantity;
    },
    0
  );

  // #5: Phone input handler - digits only
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setCustomerPhone(val);
    if (errors.phone) setErrors((prev) => { const n = { ...prev }; delete n.phone; return n; });
  }, [errors.phone]);

  const handleCheckout = async () => {
    // #5: Validation with scroll-to-error
    const newErrors: Record<string, string> = {};
    if (cartItems.length === 0) {
      toast.error("Pilih minimal satu menu");
      return;
    }
    if (!customerName.trim()) {
      newErrors.name = "Nama pemesan wajib diisi";
    }
    if (!customerPhone.trim()) {
      newErrors.phone = "Nomor WhatsApp wajib diisi";
    } else if (customerPhone.trim().length < 10 || customerPhone.trim().length > 14) {
      newErrors.phone = "Nomor WhatsApp harus 10-14 digit";
    }
    if (orderType === "delivery" && !address.trim()) {
      newErrors.address = "Alamat pengantaran wajib diisi";
    }
    if (orderType === "delivery" && distanceError) {
      newErrors.address = "Jarak melebihi batas maksimum pengantaran";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      if (newErrors.name && nameRef.current) {
        nameRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        nameRef.current.focus();
      } else if (newErrors.phone && phoneRef.current) {
        phoneRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        phoneRef.current.focus();
      } else if (newErrors.address && addressRef.current) {
        addressRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            addons: item.addons.length > 0 ? item.addons : undefined,
          })),
          orderType,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          address: orderType === "delivery" ? address : "Pickup - Ambil di lokasi HiMeal",
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

      // Task 3: Include image and productId in checkout data
      sessionStorage.setItem(
        "himeal_checkout",
        JSON.stringify({
          orderId: data.orderId,
          items: cartItems.map((item) => {
            const menuItem = menuItemsRef.current.find((m) => m.id === item.productId);
            const origPrice = menuItem?.price ?? item.price;
            return {
              productId: item.productId,
              name: item.name,
              price: item.price,
              originalPrice: origPrice !== item.price ? origPrice : undefined,
              quantity: item.quantity,
              image: item.image,
              addons: item.addons,
            };
          }),
          orderType,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          subtotal: data.subtotal,
          deliveryFee: data.deliveryFee,
          total: data.total,
          distanceKm: data.distanceKm,
          address: orderType === "delivery" ? address : "Pickup - Ambil di lokasi HiMeal",
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

  const dayName = new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(new Date());

  // Task 7: Scroll to specific slide
  const scrollToSlide = (idx: number) => {
    setActiveSlide(idx);
    const el = heroScrollRef.current;
    if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
    // Reset auto-advance timer
    if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
    if (heroSlides.length > 1) {
      heroIntervalRef.current = setInterval(() => {
        setActiveSlide((prev) => {
          const next = (prev + 1) % heroSlides.length;
          const container = heroScrollRef.current;
          if (container) container.scrollTo({ left: next * container.clientWidth, behavior: "smooth" });
          return next;
        });
      }, 4000);
    }
  };

  return (
    <>
      {/* Top Navigation Shell */}
      <header className="sticky top-0 z-50 bg-[#0C1410]/80 backdrop-blur-xl border-none">
        <div className="flex justify-between items-center w-full px-6 lg:px-8 py-6 max-w-6xl mx-auto">
          <div className="flex flex-col">
            <span className="text-3xl font-black text-[#5BDB6F] tracking-[-0.04em] font-['Manrope'] uppercase">HI MEAL!</span>
            <span className="font-['Inter'] text-[10px] tracking-[0.2em] uppercase text-on-surface-variant font-medium">Good food, good mood</span>
          </div>
          <div className="flex gap-4">
            <button className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary transition-transform active:scale-95 duration-200">
              <span className="material-symbols-outlined">eco</span>
            </button>
          </div>
        </div>
      </header>

      {/* Store mode popups */}
      <StorePopup
        mode={storeMode}
        message={storeMessage}
        nextOpen={nextOpen}
        showInfoPopup={showInfoPopup}
        onDismissInfo={() => setShowInfoPopup(false)}
      />

      <main className="px-6 lg:px-8 space-y-10 pb-32 max-w-6xl mx-auto">
        {/* Task 7: Hero Section - Auto-sliding carousel or static fallback */}
        <section className="mt-4 animate-fade-in">
          {heroSlides.length > 0 ? (
            <div>
              <div
                ref={heroScrollRef}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none hide-scrollbar rounded-3xl"
                style={{ scrollbarWidth: "none" }}
              >
                {heroSlides.map((slide) => (
                  <div key={slide.id} className="snap-start shrink-0 w-full relative h-48 rounded-3xl overflow-hidden">
                    <img src={slide.image} alt={slide.title || "HiMeal"} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                    <div className="absolute bottom-6 left-6">
                      {slide.subtitle && <span className="text-xs font-label uppercase tracking-widest text-primary font-bold">{slide.subtitle}</span>}
                      {slide.title && <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">{slide.title}</h2>}
                    </div>
                  </div>
                ))}
              </div>
              {/* Dots indicator */}
              {heroSlides.length > 1 && (
                <div className="flex justify-center gap-2 mt-3">
                  {heroSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => scrollToSlide(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === activeSlide ? "w-6 bg-primary" : "w-1.5 bg-outline-variant"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative h-48 w-full rounded-3xl overflow-hidden bg-surface-container">
              <div className="w-full h-full bg-gradient-to-br from-primary-container/30 via-surface-container to-background" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6">
                <span className="text-xs font-label uppercase tracking-widest text-primary font-bold">Elite Performance Fuel</span>
                <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">Curated Nutrition.</h2>
              </div>
            </div>
          )}
        </section>

        {/* Content Grid - 2 cols on desktop */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 space-y-10 lg:space-y-0">

        {/* Menu Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-end animate-fade-in-up">
            <div className="space-y-1">
              <h3 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight">Today&apos;s Menu</h3>
              <p className="text-sm text-on-surface-variant font-body">Chef-designed for maximum macro-efficiency.</p>
            </div>
            <span className="text-xs font-label uppercase tracking-widest text-on-secondary-container bg-secondary-container px-3 py-1 rounded-full">{dayName}</span>
          </div>
          <div className="grid gap-6">
            {menuLoading ? (
              <>
                {[1, 2].map((i) => (
                  <div key={i} className="bg-surface-container border border-primary/12 rounded-[2rem] p-5 space-y-4 animate-pulse">
                    <div className="h-40 rounded-2xl bg-surface-container-highest" />
                    <div className="space-y-2">
                      <div className="h-6 bg-surface-container-highest rounded-lg w-3/4" />
                      <div className="h-4 bg-surface-container-highest rounded-lg w-full" />
                    </div>
                    <div className="h-10 bg-surface-container-highest rounded-full w-1/2" />
                  </div>
                ))}
              </>
            ) : (
              menuItems.map((item, index) => (
                <div
                  key={item.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <MenuCard
                    item={item}
                    quantity={cart[item.id]?.quantity || 0}
                    onQuantityChange={(qty) => updateQuantity(item.id, qty)}
                    selectedAddons={cart[item.id]?.addons || []}
                    onAddonsChange={(addons) => updateAddons(item.id, addons)}
                  />
                </div>
              ))
            )}
          </div>
        </section>

        {/* Customer & Order Type Section */}
        <section className="space-y-6 lg:sticky lg:top-24 lg:self-start animate-fade-in-up" style={{ animationDelay: '200ms' }}>
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
                Pickup
              </button>
            </div>
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Nama Pemesan *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary text-lg pointer-events-none">person</span>
              <input
                ref={nameRef}
                type="text"
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); if (errors.name) setErrors((prev) => { const n = { ...prev }; delete n.name; return n; }); }}
                placeholder="Nama lengkap"
                className={`w-full pl-12 pr-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary shadow-inner ${errors.name ? "ring-2 ring-error" : ""}`}
              />
            </div>
            {errors.name && <p className="text-xs text-error font-medium pl-1">{errors.name}</p>}
          </div>

          {/* Customer Phone - Task 5: digits only, maxLength */}
          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">No. WhatsApp *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary text-lg pointer-events-none">phone</span>
              <input
                ref={phoneRef}
                type="tel"
                inputMode="numeric"
                maxLength={14}
                value={customerPhone}
                onChange={handlePhoneChange}
                placeholder="08xxxxxxxxxx"
                className={`w-full pl-12 pr-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary shadow-inner ${errors.phone ? "ring-2 ring-error" : ""}`}
              />
            </div>
            {errors.phone && <p className="text-xs text-error font-medium pl-1">{errors.phone}</p>}
          </div>

          {/* Delivery-specific fields */}
          {orderType === "delivery" && (
            <>
              {/* Delivery fee info banner */}
              <div className="botanical-card rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-lg mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
                <div className="flex-1 text-xs text-on-surface-variant leading-relaxed">
                  <span className="text-primary font-bold">Gratis ongkir</span> untuk jarak {DELIVERY_CONFIG.freeDistanceKm} km pertama.
                  Lebih dari itu mulai Rp {DELIVERY_CONFIG.baseFeeIDR.toLocaleString("id-ID")}.
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("delivery-fee-modal");
                      if (el) el.classList.toggle("hidden");
                    }}
                    className="ml-1 text-primary hover:underline font-semibold"
                  >
                    Read this
                  </button>
                </div>
              </div>

              {/* Delivery fee detail modal */}
              <div id="delivery-fee-modal" className="hidden botanical-card rounded-xl p-5 space-y-3 animate-scale-in">
                <div className="flex justify-between items-center">
                  <h4 className="font-headline font-bold text-on-surface text-sm">Rincian Ongkos Kirim</h4>
                  <button
                    type="button"
                    onClick={() => document.getElementById("delivery-fee-modal")?.classList.add("hidden")}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container-highest transition-colors"
                  >
                    <span className="material-symbols-outlined text-base text-on-surface-variant">close</span>
                  </button>
                </div>
                <div className="space-y-2 text-xs text-on-surface-variant">
                  <div className="flex justify-between py-2 border-b border-outline-variant/15">
                    <span>0 - {DELIVERY_CONFIG.freeDistanceKm} km</span>
                    <span className="text-primary font-bold">GRATIS</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-outline-variant/15">
                    <span>{DELIVERY_CONFIG.freeDistanceKm} - {DELIVERY_CONFIG.freeDistanceKm + DELIVERY_CONFIG.baseDistanceKm} km</span>
                    <span className="text-on-surface font-bold">Rp {DELIVERY_CONFIG.baseFeeIDR.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-outline-variant/15">
                    <span>Setiap km berikutnya</span>
                    <span className="text-on-surface font-bold">+ Rp {DELIVERY_CONFIG.perKmIDR.toLocaleString("id-ID")}/km</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Jarak maksimum</span>
                    <span className="text-on-surface font-bold">{DELIVERY_CONFIG.maxDistanceKm} km</span>
                  </div>
                </div>
                <p className="text-[10px] text-outline leading-relaxed">
                  Jarak dihitung via rute jalan dari lokasi HiMeal. Share lokasi untuk perhitungan otomatis, atau kami estimasi dari alamat.
                </p>
              </div>

              {/* Address */}
              <div className="space-y-2" ref={addressRef}>
                <div className="flex items-center justify-between">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Alamat Lengkap *</label>
                  <span className="text-[10px] text-outline">Pastikan mengisi informasi lengkap</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary text-lg pointer-events-none">location_on</span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ketik alamat, nama tempat, atau jalan..."
                    className="w-full pl-12 pr-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary shadow-inner"
                  />
                </div>
                {errors.address && <p className="text-xs text-error font-medium pl-1">{errors.address}</p>}
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
                  onAddressResolved={(addr) => setAddress(addr)}
                  selectedLat={selectedLat}
                  selectedLng={selectedLng}
                />
              </div>

              {/* Distance & Fee Info */}
              {distanceKm !== null && distanceKm > 0 && !distanceError && (
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

              {/* Distance exceeds max limit */}
              {distanceError && (
                <div className="bg-error/10 border border-error/30 rounded-xl p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-error text-lg mt-0.5">warning</span>
                    <div>
                      <p className="text-sm text-error font-semibold">{distanceError}</p>
                      <p className="text-xs text-on-surface-variant mt-1">Untuk pemesanan jarak jauh, silakan hubungi admin.</p>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/6287777527426?text=${encodeURIComponent(`Halo admin HiMeal, saya ingin pesan tapi jarak saya ${distanceKm} km. Apakah bisa diantar?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-full text-xs font-bold hover:opacity-90 transition-opacity active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">chat</span>
                    Hubungi via WhatsApp
                  </a>
                </div>
              )}
            </>
          )}

          {/* Pickup - show HiMeal location + catatan */}
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

              {/* Catatan Pickup */}
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
                  style={{ border: 0, filter: "invert(90%) hue-rotate(180deg) brightness(0.9) contrast(1.1)" }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src="https://maps.google.com/maps?q=-7.434855,109.2237517&z=17&output=embed"
                />
              </div>
            </div>
          )}

          {/* FEAT-14: Save data checkbox */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSaveData(!saveData)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                saveData
                  ? "bg-primary border-primary"
                  : "border-outline bg-transparent hover:border-primary/50"
              }`}
            >
              {saveData && (
                <span className="material-symbols-outlined text-on-primary text-sm" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>
              )}
            </button>
            <label
              onClick={() => setSaveData(!saveData)}
              className="text-sm text-on-surface-variant cursor-pointer select-none"
            >
              Simpan data untuk pesanan berikutnya
            </label>
          </div>
        </section>

        </div>{/* end grid */}

        {/* Partners Section */}
        {partners.length > 0 && (() => {
          const logoBox = (p: Partner) => (
            <div className="flex items-center justify-center h-12 px-5 rounded-lg opacity-70 hover:opacity-100 hover:scale-110 transition-all duration-200 cursor-default">
              {p.logo_url ? (
                <img src={p.logo_url} alt={p.name} className="h-7 w-auto object-contain" loading="lazy" />
              ) : (
                <span className="text-sm text-outline font-medium">{p.name}</span>
              )}
            </div>
          );

          if (partners.length < 3) {
            return (
              <section className="space-y-5 animate-fade-in-up py-8">
                <p className="text-center text-[10px] font-label uppercase tracking-[0.3em] text-outline font-semibold">Partnership</p>
                <div className="flex gap-8 items-center justify-center">
                  {partners.map((p) =>
                    p.link_url ? (
                      <a key={p.id} href={p.link_url} target="_blank" rel="noopener noreferrer">{logoBox(p)}</a>
                    ) : (
                      <div key={p.id}>{logoBox(p)}</div>
                    )
                  )}
                </div>
              </section>
            );
          }

          const track = [...partners, ...partners, ...partners];
          return (
            <section className="space-y-5 animate-fade-in-up py-8">
              <p className="text-center text-[10px] font-label uppercase tracking-[0.3em] text-outline font-semibold">Partnership</p>
              <div className="overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
                <div
                  className="flex gap-8 items-center"
                  style={{ animation: `scroll-partners ${partners.length * 3}s linear infinite`, width: "max-content" }}
                >
                  {track.map((p, i) =>
                    p.link_url ? (
                      <a key={`${p.id}-${i}`} href={p.link_url} target="_blank" rel="noopener noreferrer" className="shrink-0">{logoBox(p)}</a>
                    ) : (
                      <div key={`${p.id}-${i}`} className="shrink-0">{logoBox(p)}</div>
                    )
                  )}
                </div>
              </div>
            </section>
          );
        })()}
      </main>

      {/* Fun floating animation */}
      <div className="relative overflow-hidden py-8">
        <div className="flex justify-center">
          <div className="animate-float text-center">
            <div className="text-5xl leading-none" style={{ filter: "drop-shadow(0 4px 12px rgba(91,219,111,0.2))" }}>
              <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="36" fill="#182420" stroke="#5BDB6F" strokeWidth="2"/>
                <ellipse cx="30" cy="34" rx="3" ry="4" fill="#5BDB6F"/>
                <ellipse cx="50" cy="34" rx="3" ry="4" fill="#5BDB6F"/>
                <path d="M28 48 Q40 58 52 48" stroke="#5BDB6F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <path d="M20 24 Q26 18 32 22" stroke="#5BDB6F" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                <path d="M48 22 Q54 18 60 24" stroke="#5BDB6F" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                <circle cx="24" cy="42" r="4" fill="#5BDB6F" opacity="0.15"/>
                <circle cx="56" cy="42" r="4" fill="#5BDB6F" opacity="0.15"/>
              </svg>
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-surface-container-low rounded-t-[2rem]">
        <div className="max-w-6xl mx-auto px-8 lg:px-12 py-12 space-y-8">
          {/* Top row: brand | kritik & saran | copyright */}
          <div className="flex justify-between items-center">
            <div className="text-lg font-bold text-primary font-headline uppercase tracking-widest">HI MEAL!</div>
            <span
              onClick={() => router.push("/feedback")}
              className="font-['Inter'] text-sm tracking-wide uppercase text-outline-variant hover:text-primary transition-colors cursor-pointer"
            >
              Kritik & Saran
            </span>
            <p className="font-['Inter'] text-xs tracking-wide uppercase text-outline-variant hidden sm:block">&copy; {new Date().getFullYear()} HiMeal</p>
          </div>

          {/* Divider */}
          <div className="h-px bg-outline-variant/15" />

          {/* Social centered */}
          <div className="flex flex-col items-center gap-3">
            <a
              href="https://instagram.com/himeal.co"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 text-on-surface-variant hover:text-primary transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5"/>
                <circle cx="12" cy="12" r="5"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
              <span className="font-['Inter'] text-sm">@himeal.co</span>
            </a>
            <p className="text-xs text-outline">Good food, good mood.</p>
          </div>

          {/* Bottom copyright (mobile) */}
          <p className="font-['Inter'] text-[10px] tracking-wide uppercase text-outline-variant/50 text-center sm:hidden">&copy; {new Date().getFullYear()} HiMeal. Good food, good mood.</p>
        </div>
      </footer>

      {/* Floating Cart Bar */}
      {cartItems.length > 0 && (
        <CartSummary
          items={cartItems.map((item) => {
            const menuItem = menuItemsRef.current.find((m) => m.id === item.productId);
            const origPrice = menuItem?.price ?? item.price;
            return {
              productId: item.productId,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              originalPrice: origPrice !== item.price ? origPrice : undefined,
              addons: item.addons,
            };
          })}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          onCheckout={handleCheckout}
          onUpdateQty={updateQuantity}
          onUpdateAddonQty={updateAddonQty}
          isLoading={isSubmitting}
        />
      )}
    </>
  );
}
