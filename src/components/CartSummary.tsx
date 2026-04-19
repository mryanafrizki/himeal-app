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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          />

          {/* Panel */}
          <div className="relative mx-auto max-w-lg rounded-t-[2rem] border border-b-0 border-[#4a7c59]/30 bg-[#111a11] shadow-2xl shadow-black/50">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="h-1 w-10 rounded-full bg-[#414942]" />
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-5 pb-2">
              <h3 className="mb-4 text-lg font-bold font-['Manrope'] text-foreground">
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
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4a7c59]/20 text-[10px] font-bold text-[#9dd3aa]">
                          {item.quantity}x
                        </span>
                        <span className="truncate text-sm text-foreground">
                          {item.name}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="mt-0.5 pl-8 text-[11px] text-[#c1c9bf]">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-medium text-foreground">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-5 space-y-2 border-t border-[#414942]/50 pt-4">
                <div className="flex justify-between text-xs text-[#c1c9bf]">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#c1c9bf]">
                  <span>Ongkos kirim</span>
                  <span>
                    {deliveryFee === 0 ? "Gratis" : formatCurrency(deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-foreground">
                  <span>Total</span>
                  <span className="text-[#9dd3aa] font-black font-['Manrope']">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Checkout button inside expanded */}
            <div className="p-5">
              <button
                type="button"
                onClick={onCheckout}
                disabled={isLoading}
                className="w-full rounded-full bg-[#4a7c59] py-4 text-sm font-extrabold uppercase tracking-widest text-white transition-all hover:bg-[#5a8c69] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Memproses..." : `Checkout - ${formatCurrency(total)}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Collapsed bar */}
      {!isExpanded && (
        <div className="px-4 pb-8 pt-4 bg-gradient-to-t from-[#10150f] via-[#10150f]/95 to-transparent">
          <div className="mx-auto flex max-w-lg items-center gap-3 bg-[#1c211b]/90 backdrop-blur-2xl rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] px-4 py-3">
            {/* Item count + subtotal */}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="flex flex-1 items-center gap-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4a7c59] text-xs font-bold text-white">
                {totalItems}
              </span>
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-widest text-[#c1c9bf]">
                  {totalItems} item
                </p>
                <p className="text-lg font-black font-['Manrope'] text-foreground">
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
                className="ml-auto text-[#c1c9bf]"
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
              className="rounded-full bg-[#4a7c59] px-8 py-4 text-xs font-extrabold uppercase tracking-widest text-white transition-all hover:bg-[#5a8c69] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "..." : "Checkout"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
