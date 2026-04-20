"use client";

import { useState } from "react";
import type { MenuItem } from "@/lib/constants";
import { formatCurrency } from "@/lib/constants";
import { toast } from "sonner";

interface MenuCardProps {
  item: MenuItem & { is_out_of_stock?: number; max_order_qty?: number };
  quantity: number;
  notes: string;
  onQuantityChange: (qty: number) => void;
  onNotesChange: (notes: string) => void;
}

export default function MenuCard({
  item,
  quantity,
  notes,
  onQuantityChange,
  onNotesChange,
}: MenuCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const isActive = quantity > 0;
  const isOutOfStock = item.is_out_of_stock === 1;
  const maxQty = item.max_order_qty && item.max_order_qty > 0 ? item.max_order_qty : 0;

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

  return (
    <div className={`bg-surface-container border border-primary/12 rounded-[2rem] p-5 space-y-4 shadow-xl relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10 ${
      isOutOfStock ? "opacity-60" : ""
    }`}>
      {/* Out of stock overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 z-20 pointer-events-none" />
      )}

      {/* Image */}
      <div className="relative h-40 rounded-2xl overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className={`w-full h-full object-cover ${isOutOfStock ? "grayscale" : ""}`}
          loading="lazy"
        />
        {/* Out of stock badge */}
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
          <span className="text-lg font-headline font-black text-primary">{formatCurrency(item.price)}</span>
        </div>
        <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
      </div>

      {/* Quantity controls + Notes input */}
      {!isOutOfStock && (
        <div className="pt-2 flex items-center justify-between gap-4">
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
          <div className="flex-1">
            <input
              type="text"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-xl text-xs py-2 px-3 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary"
              placeholder={isActive ? "Notes (e.g. No onions)" : "Notes"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
