"use client";

import { useState, useCallback } from "react";

const ORS_API_KEY =
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjZlYTBkZTFjMjI1OTRhMTI5NTMzMzRlMjFmMTE2YzhmIiwiaCI6Im11cm11cjY0In0=";

interface DeliveryMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  onLocationClear?: () => void;
  onAddressResolved?: (address: string) => void;
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

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.openrouteservice.org/geocode/reverse?point.lat=${lat}&point.lon=${lng}&size=1`,
      { headers: { Authorization: ORS_API_KEY, Accept: "application/json" } }
    );
    const data = await res.json();
    const label = data?.features?.[0]?.properties?.label;
    return typeof label === "string" ? label : null;
  } catch {
    return null;
  }
}

export default function DeliveryMap({
  onLocationSelect,
  onLocationClear,
  onAddressResolved,
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
        reverseGeocode(directCoords.lat, directCoords.lng).then((addr) => {
          if (addr) onAddressResolved?.(addr);
        });
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
        reverseGeocode(data.coords.lat, data.coords.lng).then((addr) => {
          if (addr) onAddressResolved?.(addr);
        });
      } else if (data.finalUrl) {
        const resolved = extractCoordsFromUrl(data.finalUrl);
        if (resolved) {
          onLocationSelect(resolved.lat, resolved.lng);
          setShowMap(true);
          reverseGeocode(resolved.lat, resolved.lng).then((addr) => {
            if (addr) onAddressResolved?.(addr);
          });
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
        const { latitude, longitude } = pos.coords;
        onLocationSelect(latitude, longitude);
        setShowMap(true);
        setGpsLoading(false);
        reverseGeocode(latitude, longitude).then((addr) => {
          if (addr) onAddressResolved?.(addr);
        });
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
      {/* Toggle show/hide + clear */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="flex-1 flex items-center justify-between py-4 px-5 bg-surface-container rounded-2xl text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>pin_drop</span>
            <span>{hasLocation ? "Titik lokasi sudah ditentukan" : "Tentukan titik lokasi (opsional)"}</span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-lg">
            {showMap ? "expand_less" : "expand_more"}
          </span>
        </button>

        {/* Clear location button */}
        {hasLocation && (
          <button
            type="button"
            onClick={() => {
              onLocationClear?.();
              setShowMap(false);
              setMethod("none");
              setLinkInput("");
              setLinkError(null);
              setGpsError(null);
            }}
            className="flex items-center justify-center px-4 bg-surface-container rounded-2xl text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors active:scale-95"
            title="Hapus titik lokasi"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>

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
              <div className="botanical-card rounded-xl p-4 space-y-2">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  <span className="font-semibold text-on-surface">Cara menyalin link:</span>
                </p>
                <ol className="text-xs text-on-surface-variant leading-relaxed list-decimal list-inside space-y-1">
                  <li>Buka <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">Google Maps</a></li>
                  <li>Cari lokasi kamu atau tekan tahan di peta</li>
                  <li>Tekan tombol <span className="font-semibold text-primary">Bagikan</span> (ikon share)</li>
                  <li>Pilih <span className="font-semibold text-primary">Salin Link</span></li>
                  <li>Tempel link di kolom bawah ini</li>
                </ol>
                <a
                  href="https://support.google.com/maps/answer/144361"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-1"
                >
                  <span className="material-symbols-outlined text-xs">help</span>
                  Panduan lengkap dari Google
                </a>
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
