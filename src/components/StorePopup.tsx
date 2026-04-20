"use client";

import { useState } from "react";

interface StorePopupProps {
  mode: string;
  message: string;
  nextOpen: string;
  showInfoPopup: boolean;
  onDismissInfo: () => void;
}

export default function StorePopup({ mode, message, nextOpen, showInfoPopup, onDismissInfo }: StorePopupProps) {
  const [dismissed, setDismissed] = useState(false);

  const now = new Date();
  const sinceStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // Maintenance or Closed — full blocking popup
  if (mode === "maintenance" || mode === "closed") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
        <div className="bg-surface-container rounded-3xl p-8 max-w-sm w-full text-center space-y-5 border border-outline-variant/15 animate-scale-in">
          <span
            className="material-symbols-outlined text-5xl text-error"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {mode === "maintenance" ? "construction" : "lock"}
          </span>

          <h2 className="text-xl font-headline font-bold text-on-surface">
            {mode === "maintenance" ? "Sedang Maintenance" : "Toko Tutup"}
          </h2>

          <p className="text-sm text-on-surface-variant">{message}</p>

          <p className="text-[10px] text-outline">Sejak {sinceStr}</p>

          {nextOpen && (
            <p className="text-sm text-primary font-semibold">{nextOpen}</p>
          )}

          <div className="h-px bg-outline-variant/15" />

          <p className="text-xs text-on-surface-variant">Hubungi kami jika ada keperluan urgent:</p>

          <div className="flex justify-center gap-4">
            {/* WhatsApp */}
            <a
              href="https://wa.me/6281228610480"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 transition-colors text-sm font-medium"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
              <svg viewBox="0 0 20 20" className="w-3 h-3 opacity-60" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/></svg>
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com/himeal.co"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E4405F]/15 text-[#E4405F] hover:bg-[#E4405F]/25 transition-colors text-sm font-medium"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5"/>
                <circle cx="12" cy="12" r="5"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
              Instagram
              <svg viewBox="0 0 20 20" className="w-3 h-3 opacity-60" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/></svg>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Info — dismissable popup
  if (mode === "info" && showInfoPopup && !dismissed) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
        <div className="bg-surface-container rounded-3xl p-6 max-w-sm w-full space-y-4 border border-outline-variant/15 animate-scale-in">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
              <h3 className="font-headline font-bold text-on-surface">Informasi</h3>
            </div>
            <button
              onClick={() => { setDismissed(true); onDismissInfo(); }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-lg">close</span>
            </button>
          </div>

          <p className="text-sm text-on-surface-variant leading-relaxed">{message}</p>

          <div className="flex gap-3">
            <button
              onClick={() => { setDismissed(true); onDismissInfo(); }}
              className="flex-1 py-2.5 bg-primary-container text-on-primary-container rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
            >
              Tutup
            </button>
            <button
              onClick={() => {
                setDismissed(true);
                onDismissInfo();
                localStorage.setItem("himeal_info_dismissed", new Date().toISOString().slice(0, 10));
              }}
              className="flex-1 py-2.5 bg-surface-container-highest text-on-surface-variant rounded-xl text-xs font-medium transition-all active:scale-[0.98]"
            >
              Jangan ingatkan hari ini
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
