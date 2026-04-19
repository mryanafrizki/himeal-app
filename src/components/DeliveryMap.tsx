"use client";

import { useState } from "react";

interface DeliveryMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLat?: number;
  selectedLng?: number;
}

export default function DeliveryMap({
  onLocationSelect,
  selectedLat,
  selectedLng,
}: DeliveryMapProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      setError("Browser tidak mendukung geolokasi");
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationSelect(latitude, longitude);
        setIsLoading(false);
      },
      (err) => {
        setIsLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Izin lokasi ditolak. Aktifkan di pengaturan browser.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Lokasi tidak tersedia.");
            break;
          case err.TIMEOUT:
            setError("Waktu habis. Coba lagi.");
            break;
          default:
            setError("Gagal mendapatkan lokasi.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const hasLocation = selectedLat !== undefined && selectedLng !== undefined;

  return (
    <div className="space-y-3">
      {/* Share Location Button */}
      <button
        type="button"
        onClick={handleShareLocation}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 py-4 bg-surface-container rounded-2xl text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors active:scale-[0.98] disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
            <span>Mendapatkan lokasi...</span>
          </>
        ) : (
          <>
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              my_location
            </span>
            <span>{hasLocation ? "Perbarui Lokasi" : "Bagikan Lokasi Saya"}</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-error text-center">{error}</p>
      )}

      {/* Google Maps Embed */}
      {hasLocation && (
        <div className="rounded-2xl overflow-hidden border border-outline-variant/20 h-44">
          <iframe
            title="Lokasi pengantaran"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${selectedLat},${selectedLng}&z=16&output=embed`}
          />
        </div>
      )}
    </div>
  );
}
