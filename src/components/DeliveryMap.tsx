"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-44 items-center justify-center rounded-3xl bg-surface-container">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
        <span className="text-xs text-on-surface-variant">Memuat peta...</span>
      </div>
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
  return (
    <div className="relative h-44">
      <MapInner
        onLocationSelect={onLocationSelect}
        selectedLat={selectedLat}
        selectedLng={selectedLng}
      />
      <div className="absolute inset-0 bg-primary/5 pointer-events-none rounded-3xl" />

      {/* Map overlay hint */}
      {selectedLat === undefined && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2">
          <div className="rounded-full bg-[#111a11]/90 border border-[#4a7c59]/30 px-4 py-2 text-xs text-on-surface-variant backdrop-blur-xl">
            Ketuk peta untuk pilih lokasi pengiriman
          </div>
        </div>
      )}
    </div>
  );
}
