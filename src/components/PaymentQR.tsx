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
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Header */}
      <div className="mb-5 text-center">
        <h3 className="text-base font-semibold text-foreground">
          Scan QRIS untuk Bayar
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Gunakan aplikasi e-wallet atau mobile banking
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="rounded-xl bg-white p-4">
          <QRCodeSVG
            value={qrString}
            size={256}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
      </div>

      {/* Payment link */}
      <div className="mt-5 space-y-2">
        <p className="text-center text-[11px] text-muted-foreground">
          Atau bagikan link pembayaran
        </p>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary p-2">
          <span className="flex-1 truncate text-xs text-muted-foreground">
            {paymentLink}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={`
              shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-all
              ${
                copied
                  ? "bg-success text-primary-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary-light"
              }
            `}
          >
            {copied ? "Tersalin" : "Salin"}
          </button>
        </div>
      </div>

      {/* Order ID */}
      <div className="mt-4 text-center">
        <span className="text-[11px] text-muted-foreground">
          Order ID: {orderId}
        </span>
      </div>
    </div>
  );
}
