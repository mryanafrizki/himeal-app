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
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9dd3aa]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7 1.5C4.79 1.5 3 3.29 3 5.5C3 8.5 7 12.5 7 12.5C7 12.5 11 8.5 11 5.5C11 3.29 9.21 1.5 7 1.5ZM7 7C6.17 7 5.5 6.33 5.5 5.5C5.5 4.67 6.17 4 7 4C7.83 4 8.5 4.67 8.5 5.5C8.5 6.33 7.83 7 7 7Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Cari alamat pengiriman..."
          className="w-full pl-12 pr-4 py-4 bg-[#1c211b] border-none rounded-2xl text-sm font-medium"
        />

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#414942] border-t-[#9dd3aa]" />
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
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1c211b]"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mt-0.5 shrink-0 text-[#9dd3aa]"
                >
                  <path
                    d="M7 1.5C4.79 1.5 3 3.29 3 5.5C3 8.5 7 12.5 7 12.5C7 12.5 11 8.5 11 5.5C11 3.29 9.21 1.5 7 1.5ZM7 7C6.17 7 5.5 6.33 5.5 5.5C5.5 4.67 6.17 4 7 4C7.83 4 8.5 4.67 8.5 5.5C8.5 6.33 7.83 7 7 7Z"
                    fill="currentColor"
                  />
                </svg>
                <span className="text-sm leading-relaxed text-[#c1c9bf] line-clamp-2">
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
