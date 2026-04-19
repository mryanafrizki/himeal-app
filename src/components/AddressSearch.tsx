"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressSearchProps {
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
}

export default function AddressSearch({ value, onChange }: AddressSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
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
    if (q.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=id&viewbox=109.1,-7.5,109.4,-7.3&bounded=0`;
      const res = await fetch(url, {
        headers: { "User-Agent": "HiMeal-App" },
      });
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setIsOpen(data.length > 0);
    } catch {
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleInputChange(val: string) {
    setQuery(val);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddress(val);
    }, 500);
  }

  function handleSelect(result: NominatimResult) {
    setQuery(result.display_name);
    setIsOpen(false);
    setResults([]);
    onChange(result.display_name, parseFloat(result.lat), parseFloat(result.lon));
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        {/* Location pin icon */}
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary text-lg">location_on</span>

        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Cari alamat pengiriman..."
          className="w-full pl-12 pr-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary shadow-inner"
        />

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-[#4a7c59]/30 bg-[#111a11] shadow-2xl shadow-black/40">
          {results.map((result) => (
            <li key={result.place_id}>
              <button
                type="button"
                onClick={() => handleSelect(result)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-primary text-lg mt-0.5 shrink-0">location_on</span>
                <span className="text-sm leading-relaxed text-on-surface-variant line-clamp-2">
                  {result.display_name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
