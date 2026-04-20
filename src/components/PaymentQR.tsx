"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface PaymentQRProps {
  qrString: string;
  orderId: string;
  expiresAt: string;
}

export default function PaymentQR({
  qrString,
  orderId,
  expiresAt: _expiresAt,
}: PaymentQRProps) {
  const [copied, setCopied] = useState(false);

  const paymentLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/payment/${orderId}`
      : `/payment/${orderId}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  }

  return (
    <div className="w-full flex flex-col items-center gap-8">
      {/* QR Card */}
      <div className="bg-surface-container p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative group transition-all duration-500 hover:shadow-primary/5">
        <div className="bg-white p-4 rounded-2xl">
          <QRCodeSVG
            value={qrString}
            size={240}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
            className="w-60 h-60"
          />
        </div>
        {/* Glossy overlay effect */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none border border-white/5 bg-gradient-to-br from-white/10 to-transparent opacity-30" />
      </div>

      {/* Link Section */}
      <div className="w-full flex flex-col gap-3">
        <label className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant ml-1">Payment Link</label>
        <div className="bg-surface-container-high rounded-full pl-6 pr-2 py-2 flex items-center justify-between group transition-colors hover:bg-surface-container-highest">
          <span className="text-on-surface/80 text-sm font-medium truncate mr-4">{paymentLink}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="bg-primary-container text-on-primary-container p-2.5 rounded-full flex items-center justify-center hover:opacity-90 active:scale-90 transition-all duration-300 shadow-lg"
          >
            <span className="material-symbols-outlined text-[20px]">
              {copied ? "check" : "content_copy"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
