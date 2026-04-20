"use client";

import { useState, useEffect } from "react";
import type { MenuItem } from "@/lib/constants";
import { formatCurrency } from "@/lib/constants";
import { toast } from "sonner";

export interface Addon {
  id: string;
  name: string;
  price: number;
}

interface MenuCardProps {
  item: MenuItem & {
    is_out_of_stock?: number;
    max_order_qty?: number;
    promo_price?: number | null;
    promo_end_date?: string | null;
  };
  quantity: number;
  onQuantityChange: (qty: number) => void;
  selectedAddons?: Addon[];
  onAddonsChange?: (addons: Addon[]) => void;
}

function PromoCountdown({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(""); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) {
        setTimeLeft(`${d}d ${h}h ${m}m`);
      } else {
        setTimeLeft(`${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
      }
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  if (!timeLeft) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-[#FF2D55] font-bold tracking-wide">
      <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
      {timeLeft}
    </span>
  );
}

export default function MenuCard({
  item,
  quantity,
  onQuantityChange,
  selectedAddons = [],
  onAddonsChange,
}: MenuCardProps) {
  const [addons, setAddons] = useState<Addon[]>([]);
  const isOutOfStock = item.is_out_of_stock === 1;
  const maxQty = item.max_order_qty && item.max_order_qty > 0 ? item.max_order_qty : 0;

  // Promo logic
  const hasPromo = item.promo_price != null
    && item.promo_end_date
    && new Date(item.promo_end_date).getTime() > Date.now();
  const displayPrice = hasPromo ? item.promo_price! : item.price;

  // Fetch addons per product
  useEffect(() => {
    fetch(`/api/products/${item.id}/addons`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Addon[]) => setAddons(data))
      .catch(() => {});
  }, [item.id]);

  const handleIncrement = () => {
    if (isOutOfStock) return;
    const next = quantity + 1;
    if (maxQty > 0 && next > maxQty) {
      toast.error(`Maksimal ${maxQty} porsi per pesanan`);
      return;
    }
    onQuantityChange(next);
  };

  const handleDecrement = () => {
    if (isOutOfStock) return;
    onQuantityChange(quantity - 1);
  };

  const changeAddonQty = (addon: Addon, delta: number) => {
    if (!onAddonsChange) return;
    const existing = selectedAddons.find((a) => a.id === addon.id);
    if (existing) {
      const newQty = (existing as Addon & { qty?: number }).qty ? (existing as Addon & { qty?: number }).qty! + delta : 1 + delta;
      if (newQty <= 0) {
        onAddonsChange(selectedAddons.filter((a) => a.id !== addon.id));
      } else {
        onAddonsChange(selectedAddons.map((a) => a.id === addon.id ? { ...a, qty: newQty } : a));
      }
    } else if (delta > 0) {
      onAddonsChange([...selectedAddons, { ...addon, qty: 1 } as Addon]);
    }
  };

  return (
    <div className={`bg-surface-container border border-primary/12 rounded-[2rem] p-5 space-y-4 shadow-xl relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10 ${
      isOutOfStock ? "opacity-60" : ""
    }`}>
      {/* Out of stock overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 z-20 pointer-events-none" />
      )}

      {/* Promo badge with discount % */}
      {hasPromo && (
        <div className="absolute top-3 right-3 z-10 bg-[#FF2D55] text-white text-[11px] font-headline font-black px-3 py-1.5 rounded-full tracking-wider shadow-[0_4px_20px_rgba(255,45,85,0.4)] animate-bounce-in">
          -{Math.round((1 - item.promo_price! / item.price) * 100)}%
        </div>
      )}

      {/* Image */}
      <div className="relative h-40 rounded-2xl overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className={`w-full h-full object-cover ${isOutOfStock ? "grayscale" : ""}`}
          loading="lazy"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="bg-error-container text-on-error-container text-sm font-headline font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
              Habis
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <h4 className="text-xl font-headline font-bold text-on-surface">{item.name}</h4>
          <div className="text-right">
            {hasPromo && (
              <span className="text-sm text-on-surface-variant line-through block">
                {formatCurrency(item.price)}
              </span>
            )}
            <span className="text-lg font-headline font-black text-primary">
              {formatCurrency(displayPrice)}
            </span>
          </div>
        </div>
        <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
        {hasPromo && item.promo_end_date && (
          <PromoCountdown endDate={item.promo_end_date} />
        )}
      </div>

      {/* Addons with qty */}
      {addons.length > 0 && quantity > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant font-medium">Add-ons</span>
          <div className="space-y-1.5">
            {addons.map((addon) => {
              const sel = selectedAddons.find((a) => a.id === addon.id) as (Addon & { qty?: number }) | undefined;
              const qty = sel?.qty || 0;
              return (
                <div key={addon.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-on-surface-variant">{addon.name} <span className="text-outline">+{formatCurrency(addon.price)}</span></span>
                  <div className="flex items-center gap-1">
                    {qty > 0 ? (
                      <>
                        <button type="button" onClick={() => changeAddonQty(addon, -1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant active:scale-90 transition-transform">
                          <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-on-surface">{qty}</span>
                        <button type="button" onClick={() => changeAddonQty(addon, 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-primary-container text-on-primary-container active:scale-90 transition-transform">
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => changeAddonQty(addon, 1)} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface-variant text-[10px] font-medium hover:text-on-surface active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-xs">add</span>
                        Tambah
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity controls - no notes here, notes moved to checkout */}
      {!isOutOfStock && (
        <div className="pt-2 flex items-center gap-4">
          <div className="flex items-center bg-surface-container-highest rounded-full px-2 py-1">
            <button
              type="button"
              onClick={handleDecrement}
              className="w-8 h-8 flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
              aria-label="Kurangi jumlah"
            >
              <span className="material-symbols-outlined text-sm">remove</span>
            </button>
            <div className="flex flex-col items-center">
              <span className="px-4 font-bold text-primary">{quantity}</span>
              {maxQty > 0 && (
                <span className="text-[9px] text-on-surface-variant -mt-0.5">Maks. {maxQty}</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleIncrement}
              className={`w-8 h-8 flex items-center justify-center active:scale-90 transition-transform ${
                maxQty > 0 && quantity >= maxQty
                  ? "text-on-surface-variant/40 cursor-not-allowed"
                  : "text-on-surface"
              }`}
              aria-label="Tambah jumlah"
              disabled={maxQty > 0 && quantity >= maxQty}
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
          {quantity > 0 && (
            <span className="text-xs text-on-surface-variant font-medium">
              = {formatCurrency(displayPrice * quantity)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
