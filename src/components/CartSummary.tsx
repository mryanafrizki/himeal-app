"use client";

import { useState, useRef, useCallback } from "react";
import { formatCurrency } from "@/lib/constants";

interface CartAddon {
  id: string;
  name: string;
  price: number;
  qty?: number;
}

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  addons?: CartAddon[];
}

interface CartSummaryProps {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  onCheckout: () => void;
  onUpdateQty?: (productId: string, qty: number) => void;
  onUpdateAddonQty?: (productId: string, addonId: string, qty: number) => void;
  isLoading?: boolean;
}

export default function CartSummary({
  items,
  subtotal,
  deliveryFee,
  onCheckout,
  onUpdateQty,
  onUpdateAddonQty,
  isLoading = false,
}: CartSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Task 11: Swipe-to-dismiss
  const touchStartY = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0 && panelRef.current) {
      panelRef.current.style.transform = `translateY(${deltaY}px)`;
      panelRef.current.style.transition = "none";
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null || !panelRef.current) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    panelRef.current.style.transition = "transform 0.3s ease";
    if (deltaY > 80) {
      panelRef.current.style.transform = `translateY(100%)`;
      setTimeout(() => {
        setIsExpanded(false);
        if (panelRef.current) {
          panelRef.current.style.transform = "";
          panelRef.current.style.transition = "";
        }
      }, 300);
    } else {
      panelRef.current.style.transform = "translateY(0)";
    }
    touchStartY.current = null;
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = subtotal + deliveryFee;

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] animate-bounce-in">
      {/* Expanded panel */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            className="relative mx-auto max-w-lg rounded-t-[2rem] border border-b-0 border-primary/12 bg-surface-container shadow-2xl shadow-black/50"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
              <div className="h-1.5 w-12 rounded-full bg-outline-variant" />
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-5 pb-2">
              <h3 className="mb-4 text-lg font-headline font-bold text-on-surface">
                Ringkasan Pesanan
              </h3>

              {/* Item list */}
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="truncate text-sm text-on-surface block">{item.name}</span>
                      {item.addons && item.addons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {item.addons.map((a) => (
                            <div key={a.id} className="inline-flex items-center gap-1 bg-surface-container-highest rounded-full pl-2.5 pr-1 py-0.5">
                              <span className="text-[10px] text-on-surface-variant">{a.name}{a.qty && a.qty > 1 ? ` x${a.qty}` : ""}</span>
                              {onUpdateAddonQty && (
                                <div className="flex items-center gap-0.5">
                                  <button type="button" onClick={() => onUpdateAddonQty(item.productId, a.id, (a.qty || 1) - 1)} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-error-container/30 text-on-surface-variant active:scale-90 transition-transform">
                                    <span className="material-symbols-outlined" style={{ fontSize: "10px" }}>{(a.qty || 1) <= 1 ? "close" : "remove"}</span>
                                  </button>
                                  <button type="button" onClick={() => onUpdateAddonQty(item.productId, a.id, (a.qty || 1) + 1)} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary-container/30 text-on-surface-variant active:scale-90 transition-transform">
                                    <span className="material-symbols-outlined" style={{ fontSize: "10px" }}>add</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {onUpdateQty ? (
                        <div className="flex items-center gap-1">
                          {item.quantity === 1 ? (
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.productId, 0)}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-error-container/20 text-error active:scale-90 transition-transform"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant active:scale-90 transition-transform"
                            >
                              <span className="material-symbols-outlined text-base">remove</span>
                            </button>
                          )}
                          <span className="w-6 text-center text-sm font-bold text-on-surface">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-primary-container text-on-primary-container active:scale-90 transition-transform"
                          >
                            <span className="material-symbols-outlined text-base">add</span>
                          </button>
                        </div>
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container/20 text-[10px] font-bold text-primary">
                          {item.quantity}x
                        </span>
                      )}
                      <span className="text-sm font-headline font-medium text-on-surface w-24 text-right">
                        {formatCurrency(
                          ((item.originalPrice && item.originalPrice > item.price ? item.originalPrice : item.price) + (item.addons?.reduce((s, a) => s + a.price * (a.qty || 1), 0) || 0)) * item.quantity
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals: SUBTOTAL → DISKON → ONGKIR */}
              {(() => {
                const originalTotal = items.reduce((sum, item) => {
                  const orig = item.originalPrice && item.originalPrice > item.price ? item.originalPrice : item.price;
                  return sum + (orig + (item.addons?.reduce((s, a) => s + a.price * (a.qty || 1), 0) || 0)) * item.quantity;
                }, 0);
                const totalDiscount = originalTotal - subtotal;
                const pct = originalTotal > 0 ? Math.round((totalDiscount / originalTotal) * 100) : 0;
                return (
                  <div className="mt-5 space-y-2 border-t border-outline-variant/30 pt-4">
                    <div className="flex justify-between text-xs text-on-surface-variant">
                      <span className="font-label text-sm uppercase tracking-wider">Subtotal</span>
                      <span className="font-headline font-medium text-on-surface">{formatCurrency(originalTotal)}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="font-label text-sm uppercase tracking-wider text-[#FF2D55] font-bold">Diskon ({pct}%)</span>
                        <span className="font-headline font-bold text-[#FF2D55]">-{formatCurrency(totalDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="font-label text-sm uppercase tracking-wider text-on-surface-variant">Ongkir</span>
                      <span className="font-headline font-bold text-primary-container uppercase">
                        {deliveryFee === 0 ? "GRATIS" : formatCurrency(deliveryFee)}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-outline-variant/30 flex justify-between items-end">
                      <div>
                        <span className="font-label text-xs uppercase tracking-[0.2em] text-on-surface-variant block mb-1">Total Amount</span>
                        <span className="font-headline font-black text-3xl text-primary tracking-tighter">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Checkout button inside expanded */}
            <div className="p-5">
              <button
                type="button"
                onClick={onCheckout}
                disabled={isLoading}
                className="w-full bg-primary-container text-on-primary-container px-8 py-4 rounded-full font-headline font-extrabold uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Memproses..." : "Checkout"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Collapsed bar */}
      {!isExpanded && (
        <div className="px-4 pb-8 pt-4 bg-gradient-to-t from-background to-transparent">
          <div className="max-w-md mx-auto bg-surface-container/90 backdrop-blur-2xl rounded-full p-2 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-outline-variant/10">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="pl-6 py-1 text-left"
            >
              <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">{totalItems} Items selected</div>
              <div className="text-lg font-headline font-black text-on-surface leading-tight">{formatCurrency(total)}</div>
            </button>
            <button
              type="button"
              onClick={onCheckout}
              disabled={isLoading}
              className="bg-primary-container text-on-primary-container px-8 py-4 rounded-full font-headline font-extrabold uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "..." : "Checkout"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
