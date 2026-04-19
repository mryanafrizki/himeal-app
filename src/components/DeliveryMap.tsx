"use client";

import { useState, useCallback } from "react";

interface DeliveryMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLat?: number;
  selectedLng?: number;
}

type LocationMethod = "link" | "gps" | "none";

function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

  const placeMatch = url.match(/\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };

  const dataMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (dataMatch) return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };

  return null;
}

function isShortLink(url: string): boolean {
  return url.includes("maps.app.goo.gl") || url.includes("goo.gl/maps");
}

export default function DeliveryMap({
  onLocationSelect,
  selectedLat,
  selectedLng,
}: DeliveryMapProps) {
  const [method, setMethod] = useState<LocationMethod>("none");
  const [showMap, setShowMap] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const hasLocation = selectedLat !== undefined && selectedLng !== undefined;

  const handlePasteLink = useCallback(async () => {
    const raw = linkInput.trim();
    if (!raw) {
      setLinkError("Tempel link Google Maps");
      return;
    }

    // Extract URL from text (mobile share might include extra text like "Check out this place: https://...")
    const urlMatch = raw.match(/(https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[1] : raw;

    const isGoogleMaps =
      url.includes("google.com/maps") ||
      url.includes("maps.app.goo.gl") ||
      url.includes("goo.gl/maps") ||
      url.includes("maps.google.com");

    if (!isGoogleMaps) {
      setLinkError("Link tidak valid. Pastikan dari Google Maps.");
      return;
    }

    setLinkError(null);
    setLinkLoading(true);

    try {
      // Try extract coords directly from URL first
      const directCoords = extractCoordsFromUrl(url);
      if (directCoords) {
        onLocationSelect(directCoords.lat, directCoords.lng);
        setShowMap(true);
        setLinkLoading(false);
        return;
      }

      // Short link or no coords in URL - resolve via server
      const res = await fetch("/api/maps/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (data.coords) {
        onLocationSelect(data.coords.lat, data.coords.lng);
        setShowMap(true);
      } else if (data.finalUrl) {
        const resolved = extractCoordsFromUrl(data.finalUrl);
        if (resolved) {
          onLocationSelect(resolved.lat, resolved.lng);
          setShowMap(true);
        } else {
          setLinkError("Tidak dapat membaca koordinat. Coba klik lokasi spesifik di Google Maps lalu share.");
        }
      } else {
        setLinkError("Gagal memproses link. Coba lagi.");
      }
    } catch {
      setLinkError("Gagal memproses link. Periksa koneksi internet.");
    } finally {
      setLinkLoading(false);
    }
  }, [linkInput, onLocationSelect]);

  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Browser tidak mendukung geolokasi.");
      return;
    }

    if (typeof window !== "undefined" && window.location.protocol !== "https:") {
      setGpsError("GPS membutuhkan HTTPS. Gunakan opsi 'Tempel Link' sebagai alternatif.");
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationSelect(pos.coords.latitude, pos.coords.longitude);
        setShowMap(true);
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError("Izin lokasi ditolak. Gunakan opsi 'Tempel Link'.");
            break;
          default:
            setGpsError("Gagal mendapatkan lokasi. Gunakan opsi 'Tempel Link'.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [onLocationSelect]);

  const embedUrl = hasLocation
    ? `https://maps.google.com/maps?q=${selectedLat},${selectedLng}&z=17&output=embed`
    : "";

  return (
    <div className="space-y-4">
      {/* Toggle show/hide */}
      <button
        type="button"
        onClick={() => setShowMap(!showMap)}
        className="w-full flex items-center justify-between py-4 px-5 bg-surface-container rounded-2xl text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>pin_drop</span>
          <span>{hasLocation ? "Titik lokasi sudah ditentukan" : "Tentukan titik lokasi (opsional)"}</span>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant text-lg">
          {showMap ? "expand_less" : "expand_more"}
        </span>
      </button>

      {showMap && (
        <div className="space-y-4">
          {/* Method selector */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMethod("link")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition-all ${
                method === "link"
                  ? "bg-primary-container text-on-primary-container shadow-lg"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-base">link</span>
              Tempel Link
            </button>
            <button
              type="button"
              onClick={() => { setMethod("gps"); handleGPS(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition-all ${
                method === "gps"
                  ? "bg-primary-container text-on-primary-container shadow-lg"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-base">my_location</span>
              GPS Otomatis
            </button>
          </div>

          {/* Paste Link UI */}
          {method === "link" && (
            <div className="space-y-3">
              <div className="botanical-card rounded-xl p-4">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Buka <span className="font-semibold text-on-surface">Google Maps</span> &rarr; cari/pilih lokasi kamu &rarr; tekan <span className="font-semibold text-primary">Bagikan</span> &rarr; <span className="font-semibold text-primary">Salin Link</span> &rarr; tempel di bawah.
                </p>
              </div>

              {/* Paste from clipboard button - easier on mobile */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                      setLinkInput(text.trim());
                      setLinkError(null);
                    }
                  } catch {
                    // Clipboard API not available, user can paste manually
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-surface-container-high rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-base">content_paste</span>
                Tempel dari Clipboard
              </button>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={linkInput}
                  onChange={(e) => { setLinkInput(e.target.value); setLinkError(null); }}
                  placeholder="https://maps.app.goo.gl/..."
                  className="flex-1 px-4 py-3 bg-surface-container border-none rounded-xl text-sm text-on-surface focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handlePasteLink}
                  disabled={linkLoading}
                  className="px-5 py-3 bg-primary-container text-on-primary-container rounded-xl text-sm font-bold hover:opacity-90 transition-opacity active:scale-95 shrink-0 disabled:opacity-50"
                >
                  {linkLoading ? "..." : "Terapkan"}
                </button>
              </div>
              {linkError && <p className="text-xs text-error">{linkError}</p>}
            </div>
          )}

          {/* GPS UI */}
          {method === "gps" && (
            <div className="space-y-3">
              {gpsLoading && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
                  <span className="text-sm text-on-surface-variant">Mendapatkan lokasi...</span>
                </div>
              )}
              {gpsError && (
                <div className="botanical-card rounded-xl p-4">
                  <p className="text-xs text-error leading-relaxed">{gpsError}</p>
                </div>
              )}
            </div>
          )}

          {/* Google Maps Embed - only when we have actual coordinates */}
          {hasLocation && (
            <div className="rounded-2xl overflow-hidden border border-outline-variant/20" style={{ height: "250px" }}>
              <iframe
                title="Lokasi pengantaran"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={embedUrl}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
