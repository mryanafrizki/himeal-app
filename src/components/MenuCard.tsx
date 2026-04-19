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
        relative rounded-xl border bg-card p-4 transition-all duration-300
        ${isActive ? "border-primary shadow-[0_0_20px_rgba(74,124,89,0.15)]" : "border-border"}
      `}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-primary" />
      )}

      <div className="flex gap-4">
        {/* Image */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary">
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold leading-tight text-foreground">
              {item.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-bold text-primary-light">
              {formatCurrency(item.price)}
            </span>

            {/* Quantity controls */}
            <div className="flex items-center gap-2">
              {isActive && (
                <button
                  type="button"
                  onClick={() => onQuantityChange(quantity - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary text-foreground transition-colors hover:border-primary hover:bg-accent"
                  aria-label="Kurangi jumlah"
                >
                  <svg
                    width="12"
                    height="12"
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
                <span className="min-w-[1.25rem] text-center text-sm font-semibold text-foreground">
                  {quantity}
                </span>
              )}

              <button
                type="button"
                onClick={() => onQuantityChange(quantity + 1)}
                className={`
                  flex h-7 items-center justify-center rounded-md transition-colors
                  ${
                    isActive
                      ? "w-7 border border-primary bg-primary text-primary-foreground hover:bg-primary-light"
                      : "w-auto gap-1 px-3 bg-primary text-primary-foreground hover:bg-primary-light"
                  }
                `}
                aria-label="Tambah jumlah"
              >
                <svg
                  width="12"
                  height="12"
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
                  <span className="text-xs font-medium">Tambah</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notes section */}
      {isActive && (
        <div className="mt-3 border-t border-border pt-3">
          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary-light"
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
              className="w-full resize-none text-xs"
            />
          )}
        </div>
      )}
    </div>
  );
}
