"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center rounded-2xl bg-surface-container" style={{ height: "250px" }}>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
    </div>
  ),
});

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
        onLocationSelect(position.coords.latitude, position.coords.longitude);
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
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
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>my_location</span>
            <span>{hasLocation ? "Perbarui Lokasi GPS" : "Bagikan Lokasi Saya"}</span>
          </>
        )}
      </button>

      {error && <p className="text-xs text-error text-center">{error}</p>}

      {/* Interactive Leaflet Map - geser & double-click untuk pilih titik */}
      <div className="rounded-2xl overflow-hidden border border-outline-variant/20" style={{ height: "250px" }}>
        <LeafletMap
          onLocationSelect={onLocationSelect}
          selectedLat={selectedLat}
          selectedLng={selectedLng}
        />
      </div>

      <p className="text-xs text-on-surface-variant text-center">
        {hasLocation ? "Klik 2x di peta untuk pindahkan titik" : "Klik 2x di peta atau bagikan lokasi untuk menentukan titik"}
      </p>
    </div>
  );
}
