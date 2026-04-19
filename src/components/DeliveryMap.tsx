"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center rounded-xl border border-border bg-card">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        <span className="text-xs text-muted-foreground">Memuat peta...</span>
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
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border border-[#4a7c59]/30">
        <div className="relative h-[300px] sm:h-[400px]">
          <MapInner
            onLocationSelect={onLocationSelect}
            selectedLat={selectedLat}
            selectedLng={selectedLng}
          />

          {/* Map overlay hint */}
          {selectedLat === undefined && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2">
              <div className="rounded-full bg-[#111a11]/90 border border-[#4a7c59]/30 px-4 py-2 text-xs text-[#c1c9bf] backdrop-blur-xl">
                Ketuk peta untuk pilih lokasi pengiriman
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-[#c1c9bf]/60 text-center">Ketuk peta untuk menentukan titik pengantaran</p>
    </div>
  );
}
