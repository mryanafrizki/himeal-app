"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import { celebrate, celebrateSmall } from "@/lib/confetti";

interface CheckoutAddon {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface CheckoutItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  image: string;
  notes: string;
  addons: CheckoutAddon[];
}

interface CheckoutData {
  orderId: string;
  items: CheckoutItem[];
  orderType: string;
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
  const [editAddressNotes, setEditAddressNotes] = useState("");

  // Available addons per product (fetched from API)
  const [availableAddons, setAvailableAddons] = useState<Record<string, { id: string; name: string; price: number }[]>>({});

  // Task 6: Voucher state
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherApplied, setVoucherApplied] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherShake, setVoucherShake] = useState(false);

  // Price validation on load
  const [priceValidated, setPriceValidated] = useState(false);

  // Task 10: Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("himeal_checkout");
    if (!stored) {
      router.replace("/");
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      // Ensure items have notes and addons fields
      const items = (parsed.items || []).map((item: Record<string, unknown>) => ({
        productId: item.productId || "",
        name: item.name || "",
        quantity: item.quantity || 1,
        price: item.price || 0,
        originalPrice: item.originalPrice as number | undefined,
        image: item.image || "",
        notes: item.notes || "",
        addons: Array.isArray(item.addons) ? item.addons : [],
      }));
      setData({ ...parsed, items });
      setEditName(parsed.customerName || "");
      setEditPhone(parsed.customerPhone || "");
      setEditAddress(parsed.address || "");
    } catch {
      router.replace("/");
    }
  }, [router]);

  // Fetch all available addons for each product in the cart
  useEffect(() => {
    if (!data) return;
    const productIds = [...new Set(data.items.map((item) => item.productId))];
    productIds.forEach((pid) => {
      if (availableAddons[pid]) return; // already fetched
      fetch(`/api/products/${pid}/addons`)
        .then((res) => (res.ok ? res.json() : []))
        .then((addons: { id: string; name: string; price: number; is_active: number }[]) => {
          const active = addons
            .filter((a) => a.is_active === 1)
            .map((a) => ({ id: a.id, name: a.name, price: a.price }));
          setAvailableAddons((prev) => ({ ...prev, [pid]: active }));
        })
        .catch(() => {});
    });
  }, [data, availableAddons]);

  // Task 1: Sync changes back to sessionStorage
  const syncStorage = useCallback((updated: CheckoutData) => {
    sessionStorage.setItem("himeal_checkout", JSON.stringify(updated));
    // Also sync cart
    const cartObj: Record<string, unknown> = {};
    updated.items.forEach((item) => {
      cartObj[item.productId] = {
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        addons: item.addons,
      };
    });
    sessionStorage.setItem("himeal_cart", JSON.stringify(cartObj));
  }, []);

  // Task 1: Recalculate subtotal/total from items
  const recalcTotals = useCallback((items: CheckoutItem[], currentData: CheckoutData): CheckoutData => {
    const subtotal = items.reduce((sum, item) => {
      const addonTotal = item.addons.reduce((a, ad) => a + ad.price * (ad.qty || 1), 0);
      return sum + (item.price + addonTotal) * item.quantity;
    }, 0);
    const total = subtotal + currentData.deliveryFee - voucherDiscount;
    return { ...currentData, items, subtotal, total: Math.max(0, total) };
  }, [voucherDiscount]);

  // Task 1: Update item quantity
  const updateItemQty = useCallback((index: number, delta: number) => {
    if (!data) return;
    const items = [...data.items];
    const newQty = items[index].quantity + delta;
    if (newQty <= 0) {
      items.splice(index, 1);
    } else {
      items[index] = { ...items[index], quantity: newQty };
    }
    if (items.length === 0) {
      sessionStorage.removeItem("himeal_checkout");
      sessionStorage.setItem("himeal_cart", "{}");
      router.replace("/");
      return;
    }
    const updated = recalcTotals(items, data);
    setData(updated);
    syncStorage(updated);
  }, [data, recalcTotals, syncStorage, router]);

  // Update addon qty on checkout item
  const updateItemAddonQty = useCallback((index: number, addonId: string, qty: number) => {
    if (!data) return;
    const items = [...data.items];
    const item = { ...items[index] };
    if (qty <= 0) {
      item.addons = item.addons.filter((a) => a.id !== addonId);
    } else {
      item.addons = item.addons.map((a) => a.id === addonId ? { ...a, qty } : a);
    }
    items[index] = item;
    const updated = recalcTotals(items, data);
    setData(updated);
    syncStorage(updated);
  }, [data, recalcTotals, syncStorage]);

  // Add a new addon to a cart item
  const addAddonToItem = useCallback((index: number, addon: { id: string; name: string; price: number }) => {
    if (!data) return;
    const items = [...data.items];
    const item = { ...items[index] };
    // Only add if not already present
    if (item.addons.some((a) => a.id === addon.id)) return;
    item.addons = [...item.addons, { id: addon.id, name: addon.name, price: addon.price, qty: 1 }];
    items[index] = item;
    const updated = recalcTotals(items, data);
    setData(updated);
    syncStorage(updated);
  }, [data, recalcTotals, syncStorage]);

  // Validate cart item prices against server on load
  useEffect(() => {
    if (!data || priceValidated) return;
    const validatePrices = async () => {
      try {
        const res = await fetch("/api/products/validate-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: data.items.map((i) => ({ productId: i.productId, price: i.price })),
          }),
        });
        if (!res.ok) return;
        const result = await res.json();
        const serverItems: { productId: string; currentPrice: number; originalPrice: number; stale: boolean; removed: boolean }[] = result.items || [];
        const serverMap = new Map(serverItems.map((si) => [si.productId, si]));
        let hasChanges = false;
        let updatedItems = data.items.filter((item) => {
          const sv = serverMap.get(item.productId);
          if (sv?.removed) { hasChanges = true; return false; }
          return true;
        });
        updatedItems = updatedItems.map((item) => {
          const sv = serverMap.get(item.productId);
          if (sv?.stale) { hasChanges = true; return { ...item, price: sv.currentPrice, originalPrice: sv.originalPrice }; }
          return item;
        });
        if (hasChanges) {
          if (updatedItems.length === 0) {
            sessionStorage.removeItem("himeal_checkout");
            sessionStorage.setItem("himeal_cart", "{}");
            toast.info("Semua produk dalam keranjang sudah tidak tersedia");
            router.replace("/");
            return;
          }
          const updated = recalcTotals(updatedItems, data);
          setData(updated);
          syncStorage(updated);
          toast.info("Harga beberapa produk telah diperbarui");
        }
      } catch { /* allow checkout to proceed */ }
      finally { setPriceValidated(true); }
    };
    validatePrices();
  }, [data, priceValidated, recalcTotals, syncStorage, router]);

  // Task 4b: Update item notes
  const updateItemNotes = useCallback((index: number, notes: string) => {
    if (!data) return;
    const items = [...data.items];
    items[index] = { ...items[index], notes };
    const updated = { ...data, items };
    setData(updated);
    syncStorage(updated);
  }, [data, syncStorage]);

  const saveField = (field: string) => {
    if (!data) return;
    const updated = { ...data };
    if (field === "name") updated.customerName = editName.trim();
    if (field === "phone") updated.customerPhone = editPhone.trim();
    if (field === "address") updated.address = editAddress.trim();
    if (field === "addressNotes") updated.addressNotes = editAddressNotes.trim();
    setData(updated);
    sessionStorage.setItem("himeal_checkout", JSON.stringify(updated));
    try {
      const savedCustomer = sessionStorage.getItem("himeal_customer");
      if (savedCustomer) {
        const c = JSON.parse(savedCustomer);
        if (field === "name") c.customerName = updated.customerName;
        if (field === "phone") c.customerPhone = updated.customerPhone;
        if (field === "address") c.address = updated.address;
        if (field === "addressNotes") c.addressNotes = updated.addressNotes;
        sessionStorage.setItem("himeal_customer", JSON.stringify(c));
      }
    } catch { /* ignore */ }
    setEditingField(null);
    toast.success("Data diperbarui");
  };

  // Task 6: Apply voucher
  const applyVoucher = async () => {
    if (!data || !voucherCode.trim()) return;
    setVoucherLoading(true);
    setVoucherError("");
    try {
      const res = await fetch("/api/voucher/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherCode.trim(), orderTotal: data.subtotal }),
      });
      const result = await res.json();
      if (!res.ok || !result.valid) {
        setVoucherError(result.error || "Kode voucher tidak valid");
        setVoucherApplied(false);
        setVoucherDiscount(0);
        setVoucherShake(true);
        setTimeout(() => setVoucherShake(false), 600);
        return;
      }
      const discount = result.discount || 0;
      setVoucherDiscount(discount);
      setVoucherApplied(true);
      const newTotal = Math.max(0, data.subtotal + data.deliveryFee - discount);
      setData({ ...data, total: newTotal });
      celebrateSmall();
      toast.success(`Voucher berhasil! Diskon ${formatCurrency(discount)}`);
    } catch {
      setVoucherError("Gagal memvalidasi voucher");
    } finally {
      setVoucherLoading(false);
    }
  };

  // Task 10: Show confirmation modal before payment
  const handlePayClick = () => {
    setShowConfirmModal(true);
  };

  // Task 10: Confirm and proceed with payment
  const handleConfirmPay = async () => {
    if (!data) return;
    setShowConfirmModal(false);
    setIsProcessing(true);

    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: data.orderId,
          voucherCode: voucherApplied ? voucherCode.trim() : undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Gagal membuat pembayaran");
        return;
      }

      celebrate();
      sessionStorage.removeItem("himeal_checkout");
      router.push(`/payment/${data.orderId}`);
    } catch {
      toast.error("Terjadi kesalahan, coba lagi");
    } finally {
      setIsProcessing(false);
    }
  };

  const isTakeaway = data?.orderType === "takeaway";
  const displayTotal = data ? Math.max(0, data.subtotal + data.deliveryFee - voucherDiscount) : 0;

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

        {/* Address / Pickup */}
        <section className="mb-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h2 className="font-headline text-on-surface-variant text-xs uppercase tracking-widest mb-4">
            {isTakeaway ? "Pengambilan" : "Alamat Pengantaran"}
          </h2>
          <div className="botanical-card rounded-xl p-6 flex items-start gap-5">
            <div className="bg-primary-container/20 p-3 rounded-full shrink-0">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isTakeaway ? "storefront" : "location_on"}
              </span>
            </div>
            <div className="flex-grow">
              {editingField === "address" && !isTakeaway ? (
                <div className="space-y-2">
                  <textarea value={editAddress} onChange={(e) => setEditAddress(e.target.value)} rows={2} className="w-full px-3 py-2 bg-surface-container border-none rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary resize-none" autoFocus />
                  <div className="flex gap-2">
                    <button onClick={() => saveField("address")} className="text-primary text-xs font-bold uppercase">Simpan</button>
                    <button onClick={() => setEditingField(null)} className="text-on-surface-variant text-xs uppercase">Batal</button>
                  </div>
                </div>
              ) : isTakeaway ? (
                <div className="space-y-2">
                  <p className="font-headline font-bold text-lg text-on-surface">Ambil ke Toko</p>
                  <p className="text-sm text-on-surface-variant">Juple&apos;s House, Purwokerto</p>
                  <a
                    href="https://maps.google.com/maps?q=-7.434855,109.2237517"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold hover:underline mt-1"
                  >
                    <span className="material-symbols-outlined text-base">map</span>
                    Buka di Google Maps
                    <span className="material-symbols-outlined text-xs opacity-60">open_in_new</span>
                  </a>
                </div>
              ) : (
                <>
                  <p className="font-headline font-bold text-lg text-on-surface">{data.address}</p>
                  {data.distanceKm > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-on-surface-variant text-sm">{data.distanceKm} km via jalan</span>
                    </div>
                  )}
                </>
              )}
            </div>
            {editingField !== "address" && !isTakeaway && (
              <button
                onClick={() => { setEditAddress(data.address); setEditingField("address"); }}
                className="text-primary font-headline font-bold text-xs uppercase tracking-wider hover:opacity-80 transition-opacity shrink-0"
              >
                Ubah
              </button>
            )}
          </div>
        </section>

        {/* Editable notes section */}
        <section className="mb-10 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <h2 className="font-headline text-on-surface-variant text-xs uppercase tracking-widest mb-4">
            {isTakeaway ? "Catatan Pickup" : "Catatan Alamat"}
          </h2>
          {editingField === "addressNotes" ? (
            <div className="botanical-card rounded-xl p-5 space-y-3">
              <textarea
                value={editAddressNotes}
                onChange={(e) => setEditAddressNotes(e.target.value)}
                placeholder={isTakeaway ? "Contoh: Ambil jam 12 siang, minta extra sambal" : "Contoh: Taro di pager, rumah cat hijau, lantai 2"}
                rows={2}
                className="w-full bg-surface-container border-none rounded-xl text-sm py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary resize-none"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => saveField("addressNotes")} className="text-primary text-xs font-bold uppercase tracking-wider">Simpan</button>
                <button onClick={() => setEditingField(null)} className="text-on-surface-variant text-xs uppercase">Batal</button>
              </div>
            </div>
          ) : (
            <div className="botanical-card rounded-xl p-5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>edit_note</span>
                <p className="text-sm text-on-surface-variant">
                  {data.addressNotes || <span className="text-outline italic">Belum ada catatan</span>}
                </p>
              </div>
              <button
                onClick={() => { setEditAddressNotes(data.addressNotes || ""); setEditingField("addressNotes"); }}
                className="text-primary font-headline font-bold text-xs uppercase tracking-wider hover:opacity-80 transition-opacity shrink-0"
              >
                {data.addressNotes ? "Ubah" : "Tambah"}
              </button>
            </div>
          )}
        </section>

        {/* Task 1+3+4b: Order Items with qty +/-, product image, notes */}
        <section className="mb-10">
          <h2 className="font-headline text-on-surface-variant text-xs uppercase tracking-widest mb-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>Your Selection</h2>
          <div className="space-y-4">
            {data.items.map((item, i) => (
              <div key={`${item.productId}-${i}`} className="botanical-card rounded-xl overflow-hidden p-4 space-y-3 animate-slide-in-right" style={{ animationDelay: `${300 + i * 100}ms` }}>
                <div className="flex items-center gap-4">
                  {/* Task 3: Product image */}
                  <div className="relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary-container/20 to-surface-container" />
                    )}
                    {item.originalPrice && item.originalPrice > item.price && (
                      <div className="absolute top-1 right-1 bg-[#FF2D55] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                        -{Math.round((1 - item.price / item.originalPrice) * 100)}%
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-headline font-bold text-on-surface truncate">{item.name}</h3>
                      <span className="font-headline font-bold text-on-surface shrink-0">
                        {formatCurrency(((item.originalPrice && item.originalPrice > item.price ? item.originalPrice : item.price) + item.addons.reduce((s, a) => s + a.price * (a.qty || 1), 0)) * item.quantity)}
                      </span>
                    </div>
                    {/* All available addons for this product */}
                    {(() => {
                      const productAddons = availableAddons[item.productId] || [];
                      const cartAddonIds = new Set(item.addons.map((a) => a.id));
                      const unselected = productAddons.filter((a) => !cartAddonIds.has(a.id));
                      if (item.addons.length === 0 && unselected.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {/* Selected addons with qty controls */}
                          {item.addons.map((a) => (
                            <div key={a.id} className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5">
                              <span className="text-xs text-primary font-medium">{a.name} +{formatCurrency(a.price)}</span>
                              <div className="flex items-center gap-1 ml-1">
                                <button type="button" onClick={() => updateItemAddonQty(i, a.id, (a.qty || 1) - 1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-error-container/30 hover:text-error text-primary active:scale-90 transition-all">
                                  <span className="material-symbols-outlined text-sm">{(a.qty || 1) <= 1 ? "close" : "remove"}</span>
                                </button>
                                <span className="w-5 text-center text-xs font-bold text-primary">{a.qty || 1}</span>
                                <button type="button" onClick={() => updateItemAddonQty(i, a.id, (a.qty || 1) + 1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary-container/50 text-primary active:scale-90 transition-all">
                                  <span className="material-symbols-outlined text-sm">add</span>
                                </button>
                              </div>
                            </div>
                          ))}
                          {/* Unselected addons with add button */}
                          {unselected.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => addAddonToItem(i, a)}
                              className="inline-flex items-center gap-1.5 border border-outline-variant/30 rounded-xl px-3 py-1.5 hover:border-primary/40 hover:bg-primary/5 transition-colors active:scale-95"
                            >
                              <span className="text-xs text-on-surface-variant">{a.name} +{formatCurrency(a.price)}</span>
                              <span className="material-symbols-outlined text-primary text-sm">add_circle</span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                    {/* Qty +/- controls */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateItemQty(i, -1)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-highest text-on-surface-variant hover:bg-error-container/30 hover:text-error active:scale-90 transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">remove</span>
                      </button>
                      <span className="w-8 text-center font-headline font-bold text-primary text-lg">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateItemQty(i, 1)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-container text-on-primary-container hover:opacity-90 active:scale-90 transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">add</span>
                      </button>
                    </div>
                  </div>
                </div>
                {/* Task 4b: Notes input per item */}
                <textarea
                  value={item.notes}
                  onChange={(e) => updateItemNotes(i, e.target.value)}
                  placeholder="Catatan: tanpa bawang, extra sambal..."
                  rows={1}
                  className="w-full bg-surface-container-low border-none rounded-xl text-xs py-2 px-3 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary resize-none"
                />
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

        {/* Task 6: Voucher Input */}
        <section className="mb-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className={`botanical-card rounded-xl p-5 space-y-3 ${voucherShake ? "animate-shake" : ""} ${voucherError ? "border-error/40" : voucherApplied ? "border-primary/40" : ""}`}>
            <p className="text-sm font-medium text-on-surface">Punya kode voucher?</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => { setVoucherCode(e.target.value.toUpperCase()); setVoucherError(""); setVoucherShake(false); }}
                placeholder="Masukkan kode"
                disabled={voucherApplied}
                className={`flex-1 px-4 py-3 bg-surface-container rounded-xl text-sm font-medium text-on-surface focus:ring-2 disabled:opacity-50 ${voucherError ? "ring-2 ring-error/50 focus:ring-error" : "border-none focus:ring-primary"}`}
              />
              {!voucherApplied ? (
                <button
                  onClick={applyVoucher}
                  disabled={voucherLoading || !voucherCode.trim()}
                  className="px-5 py-3 bg-primary-container text-on-primary-container rounded-xl text-sm font-bold uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50"
                >
                  {voucherLoading ? "..." : "Terapkan"}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setVoucherApplied(false);
                    setVoucherDiscount(0);
                    setVoucherCode("");
                    if (data) {
                      const updated = { ...data, total: data.subtotal + data.deliveryFee };
                      setData(updated);
                    }
                  }}
                  className="px-5 py-3 bg-error/20 text-error rounded-xl text-sm font-bold uppercase tracking-wider active:scale-95 transition-all"
                >
                  Hapus
                </button>
              )}
            </div>
            {voucherError && (
              <p className="text-xs text-error font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                {voucherError}
              </p>
            )}
            {voucherApplied && (
              <p className="text-xs text-primary font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Voucher diterapkan! Diskon {formatCurrency(voucherDiscount)}
              </p>
            )}
          </div>
        </section>

        {/* Pricing Summary Card */}
        <section className="mb-20 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <div className="botanical-card rounded-xl p-8 space-y-4">
            {(() => {
              const origTotal = data.items.reduce((sum, item) => {
                const orig = item.originalPrice && item.originalPrice > item.price ? item.originalPrice : item.price;
                return sum + (orig + item.addons.reduce((s, a) => s + a.price * (a.qty || 1), 0)) * item.quantity;
              }, 0);
              const promoDiscount = origTotal - data.subtotal;
              const promoPct = origTotal > 0 ? Math.round((promoDiscount / origTotal) * 100) : 0;
              return (
                <>
                  <div className="flex justify-between items-center text-on-surface-variant">
                    <span className="font-label text-sm uppercase tracking-wider">Subtotal</span>
                    <span className="font-headline font-medium text-on-surface">{formatCurrency(origTotal)}</span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="font-label text-sm uppercase tracking-wider text-[#FF2D55] font-bold">Diskon Promo ({promoPct}%)</span>
                      <span className="font-headline font-bold text-[#FF2D55]">-{formatCurrency(promoDiscount)}</span>
                    </div>
                  )}
                </>
              );
            })()}
            {voucherApplied && voucherDiscount > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-label text-sm uppercase tracking-wider text-tertiary">Diskon Voucher</span>
                <span className="font-headline font-bold text-tertiary">-{formatCurrency(voucherDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="font-label text-sm uppercase tracking-wider text-on-surface-variant">Ongkir (Shipping)</span>
              <span className="font-headline font-bold text-primary-container uppercase">
                {data.deliveryFee === 0 ? "GRATIS" : formatCurrency(data.deliveryFee)}
              </span>
            </div>
            <div className="pt-6 border-t border-outline-variant/30 flex justify-between items-end">
              <div>
                <span className="font-label text-xs uppercase tracking-[0.2em] text-on-surface-variant block mb-1">Total Amount</span>
                <span className="font-headline font-black text-4xl text-primary tracking-tighter animate-fade-in-up" style={{ animationDelay: '700ms' }}>
                  {formatCurrency(displayTotal)}
                </span>
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
              onClick={handlePayClick}
              disabled={isProcessing || !priceValidated}
              className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-extrabold text-lg py-5 rounded-full shadow-[0_20px_40px_rgba(91,219,111,0.2)] hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              {isProcessing ? "Memproses..." : !priceValidated ? "Memvalidasi harga..." : "Bayar Sekarang"}
            </button>
          </div>
        </section>
      </main>

      {/* Task 10: Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-surface-container rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto border border-primary/12 shadow-2xl animate-scale-in">
            <h3 className="font-headline font-bold text-xl text-on-surface mb-6">Konfirmasi Pesanan</h3>

            {/* Customer info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                <span className="text-on-surface font-medium">{data.customerName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>phone</span>
                <span className="text-on-surface-variant">{data.customerPhone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isTakeaway ? "storefront" : "location_on"}
                </span>
                <span className="text-on-surface-variant">{isTakeaway ? "Pickup" : data.address}</span>
              </div>
            </div>

            {/* Items */}
            <div className="border-t border-outline-variant/20 pt-4 space-y-2 mb-4">
              {data.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-on-surface">{item.quantity}x {item.name}</span>
                  <span className="text-on-surface font-medium">{formatCurrency((item.price + item.addons.reduce((s, a) => s + a.price * (a.qty || 1), 0)) * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-outline-variant/20 pt-4 space-y-2 mb-6">
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Subtotal</span>
                <span>{formatCurrency(data.subtotal)}</span>
              </div>
              {voucherApplied && voucherDiscount > 0 && (
                <div className="flex justify-between text-sm text-tertiary">
                  <span>Diskon</span>
                  <span>-{formatCurrency(voucherDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Ongkir</span>
                <span>{data.deliveryFee === 0 ? "GRATIS" : formatCurrency(data.deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-headline font-bold text-lg text-primary pt-2 border-t border-outline-variant/20">
                <span>Total</span>
                <span>{formatCurrency(displayTotal)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3.5 rounded-full border border-outline-variant/30 text-on-surface-variant font-headline font-bold text-sm uppercase tracking-wider hover:bg-surface-container-high transition-colors active:scale-95"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmPay}
                disabled={isProcessing}
                className="flex-1 py-3.5 rounded-full bg-primary text-on-primary font-headline font-bold text-sm uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {isProcessing ? "..." : "Konfirmasi & Bayar"}
              </button>
            </div>
          </div>
        </div>
      )}

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
