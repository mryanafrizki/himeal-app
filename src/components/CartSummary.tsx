"use client";

import { useState, useRef, useCallback } from "react";
import { formatCurrency } from "@/lib/constants";

interface CartAddon {
  id: string;
  name: string;
  price: number;
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
  isLoading?: boolean;
}

export default function CartSummary({
  items,
  subtotal,
  deliveryFee,
  onCheckout,
  onUpdateQty,
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
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          + {item.addons.map((a) => a.name).join(", ")}
                        </p>
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
                      <div className="w-24 text-right">
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-[10px] text-on-surface-variant line-through block">
                            {formatCurrency(item.originalPrice * item.quantity)}
                          </span>
                        )}
                        <span className="text-sm font-headline font-medium text-on-surface">
                          {formatCurrency(
                            (item.price + (item.addons?.reduce((s, a) => s + a.price, 0) || 0)) * item.quantity
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              {(() => {
                const totalDiscount = items.reduce((sum, item) => {
                  if (item.originalPrice && item.originalPrice > item.price) {
                    return sum + (item.originalPrice - item.price) * item.quantity;
                  }
                  return sum;
                }, 0);
                return totalDiscount > 0 ? (
                  <div className="mt-4 flex justify-between items-center bg-primary/10 rounded-xl px-4 py-2.5">
                    <span className="font-label text-xs uppercase tracking-wider text-primary font-bold">Total Diskon</span>
                    <span className="font-headline font-bold text-primary">-{formatCurrency(totalDiscount)}</span>
                  </div>
                ) : null;
              })()}
              <div className="mt-3 space-y-2 border-t border-outline-variant/30 pt-4">
                <div className="flex justify-between text-xs text-on-surface-variant">
                  <span className="font-label text-sm uppercase tracking-wider">Subtotal</span>
                  <span className="font-headline font-medium text-on-surface">{formatCurrency(subtotal)}</span>
                </div>
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
