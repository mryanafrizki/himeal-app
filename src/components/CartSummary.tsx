"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/constants";

interface CartItem {
  name: string;
  quantity: number;
  price: number;
  notes: string;
}

interface CartSummaryProps {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  onCheckout: () => void;
  isLoading?: boolean;
}

export default function CartSummary({
  items,
  subtotal,
  deliveryFee,
  onCheckout,
  isLoading = false,
}: CartSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
          <div className="relative mx-auto max-w-lg rounded-t-[2rem] border border-b-0 border-primary/12 bg-surface-container shadow-2xl shadow-black/50">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="h-1 w-10 rounded-full bg-outline-variant" />
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
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container/20 text-[10px] font-bold text-primary">
                          {item.quantity}x
                        </span>
                        <span className="truncate text-sm text-on-surface">
                          {item.name}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="mt-0.5 pl-8 text-[11px] text-on-surface-variant">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-headline font-medium text-on-surface">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-5 space-y-2 border-t border-outline-variant/30 pt-4">
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

      {/* Collapsed bar - matches Stitch floating cart */}
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
