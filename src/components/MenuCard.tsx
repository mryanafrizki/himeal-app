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
    <div
      className={`
        relative bg-[#111a11] border rounded-[2rem] p-5 space-y-4 shadow-xl transition-all duration-300
        ${isActive ? "border-[#4a7c59]/60 shadow-[0_0_30px_rgba(74,124,89,0.12)]" : "border-[#4a7c59]/30"}
      `}
    >
      {/* Image */}
      <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-[#1c211b]">
        <img
          src={item.image}
          alt={item.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="space-y-3">
        <div>
          <h3 className="text-xl font-bold font-['Manrope'] leading-tight text-foreground">
            {item.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#c1c9bf]">
            {item.description}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-lg font-black font-['Manrope'] text-[#9dd3aa]">
            {formatCurrency(item.price)}
          </span>

          {/* Quantity controls */}
          <div className="flex items-center gap-1">
            {isActive && (
              <button
                type="button"
                onClick={() => onQuantityChange(quantity - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#313630] text-foreground transition-colors hover:bg-[#414942]"
                aria-label="Kurangi jumlah"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2.5 6H9.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}

            {isActive && (
              <span className="min-w-[2rem] text-center text-base font-bold font-['Manrope'] text-foreground">
                {quantity}
              </span>
            )}

            <button
              type="button"
              onClick={() => onQuantityChange(quantity + 1)}
              className={`
                flex items-center justify-center rounded-full transition-colors
                ${
                  isActive
                    ? "h-9 w-9 bg-[#4a7c59] text-white hover:bg-[#5a8c69]"
                    : "h-9 gap-1.5 px-5 bg-[#4a7c59] text-white hover:bg-[#5a8c69]"
                }
              `}
              aria-label="Tambah jumlah"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 2.5V9.5M2.5 6H9.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              {!isActive && (
                <span className="text-xs font-extrabold uppercase tracking-wider">Tambah</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notes section */}
      {isActive && (
        <div className="pt-1">
          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="flex items-center gap-1.5 text-xs text-[#c1c9bf] transition-colors hover:text-[#9dd3aa]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.5 10.5L10.5 2.5M10.5 2.5H5.5M10.5 2.5V7.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Tambah catatan
            </button>
          ) : (
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Catatan pesanan (contoh: tanpa sambal)"
              rows={2}
              className="w-full resize-none bg-[#181d17] border-none rounded-xl text-xs p-3"
            />
          )}
        </div>
      )}
    </div>
  );
}
