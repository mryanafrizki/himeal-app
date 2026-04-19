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
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Expanded panel */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          />

          {/* Panel */}
          <div className="relative mx-auto max-w-lg rounded-t-2xl border border-b-0 border-border bg-card shadow-2xl shadow-black/40">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-4 pb-2">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Ringkasan Pesanan
              </h3>

              {/* Item list */}
              <div className="space-y-2.5">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-secondary text-[10px] font-bold text-primary-light">
                          {item.quantity}x
                        </span>
                        <span className="truncate text-sm text-foreground">
                          {item.name}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="mt-0.5 pl-7 text-[11px] text-muted-foreground">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm text-foreground">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 space-y-1.5 border-t border-border pt-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Ongkos kirim</span>
                  <span>
                    {deliveryFee === 0 ? "Gratis" : formatCurrency(deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-foreground">
                  <span>Total</span>
                  <span className="text-primary-light">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Checkout button inside expanded */}
            <div className="p-4">
              <button
                type="button"
                onClick={onCheckout}
                disabled={isLoading}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-light active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Memproses..." : `Checkout - ${formatCurrency(total)}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Collapsed bar */}
      {!isExpanded && (
        <div className="border-t border-border bg-card/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
            {/* Item count + subtotal */}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="flex flex-1 items-center gap-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                {totalItems}
              </span>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">
                  {totalItems} item
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(total)}
                </p>
              </div>

              {/* Expand chevron */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="ml-auto text-muted-foreground"
              >
                <path
                  d="M4 10L8 6L12 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Checkout */}
            <button
              type="button"
              onClick={onCheckout}
              disabled={isLoading}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-light active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "..." : "Checkout"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
