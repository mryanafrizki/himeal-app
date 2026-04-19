"use client";

import { useState } from "react";
import type { MenuItem } from "@/lib/constants";
import { formatCurrency } from "@/lib/constants";

interface MenuCardProps {
  item: MenuItem;
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

  return (
    <div className="bg-[#111a11] border border-[#4a7c59]/30 rounded-[2rem] p-5 space-y-4 shadow-xl">
      {/* Image */}
      <div className="relative h-40 rounded-2xl overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />

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
      <div className="pt-2 flex items-center justify-between gap-4">
        <div className="flex items-center bg-surface-container-highest rounded-full px-2 py-1">
          <button
            type="button"
            onClick={() => onQuantityChange(quantity - 1)}
            className="w-8 h-8 flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
            aria-label="Kurangi jumlah"
          >
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
          <span className="px-4 font-bold text-primary">{quantity}</span>
          <button
            type="button"
            onClick={() => onQuantityChange(quantity + 1)}
            className="w-8 h-8 flex items-center justify-center text-on-surface active:scale-90 transition-transform"
            aria-label="Tambah jumlah"
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
    </div>
  );
}
