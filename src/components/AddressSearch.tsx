"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const ORS_API_KEY =
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjZlYTBkZTFjMjI1OTRhMTI5NTMzMzRlMjFmMTE2YzhmIiwiaCI6Im11cm11cjY0In0=";

interface GeoResult {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

interface AddressSearchProps {
  value: string;
  onChange: (address: string, lat: number | null, lng: number | null) => void;
}

export default function AddressSearch({ value, onChange }: AddressSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSelectedRef = useRef<string>(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAddress = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      // Use OpenRouteService Geocode API - much better results than Nominatim
      const url = `https://api.openrouteservice.org/geocode/search?text=${encodeURIComponent(q)}&boundary.country=ID&boundary.rect.min_lon=109.0&boundary.rect.min_lat=-7.6&boundary.rect.max_lon=109.5&boundary.rect.max_lat=-7.2&size=6&layers=address,venue,street,neighbourhood,locality`;
      const res = await fetch(url, {
        headers: {
          Authorization: ORS_API_KEY,
          Accept: "application/json",
        },
      });
      const data = await res.json();
      const features = data.features || [];
      const mapped: GeoResult[] = features.map(
        (f: { properties: { id: string; label: string }; geometry: { coordinates: number[] } }) => ({
          id: f.properties.id,
          label: f.properties.label,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
        })
      );
      setResults(mapped);
      setIsOpen(mapped.length > 0);
    } catch {
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleInputChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(val), 400);
  }

  function handleSelect(result: GeoResult) {
    setQuery(result.label);
    lastSelectedRef.current = result.label;
    setIsOpen(false);
    setResults([]);
    onChange(result.label, result.lat, result.lng);
  }

  function handleBlur() {
    // Delay to allow click on suggestion to fire first
    setTimeout(() => {
      if (query.trim() && query !== lastSelectedRef.current) {
        lastSelectedRef.current = query;
        onChange(query, null, null);
      }
    }, 200);
  }

  return (
    <div ref={containerRef} className="relative w-full z-[9999]">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary text-lg pointer-events-none">location_on</span>

        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={handleBlur}
          placeholder="Ketik alamat, nama tempat, atau jalan..."
          className="w-full !pl-12 pr-10 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary shadow-inner"
        />

        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute z-[9999] mt-2 w-full overflow-hidden rounded-2xl border border-primary/12 bg-surface-container shadow-2xl shadow-black/40 max-h-72 overflow-y-auto">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => handleSelect(result)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-primary text-lg mt-0.5 shrink-0">location_on</span>
                <span className="text-sm leading-relaxed text-on-surface-variant line-clamp-2">
                  {result.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
