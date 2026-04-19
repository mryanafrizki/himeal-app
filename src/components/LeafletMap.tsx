"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon in Next.js
const DefaultIcon = L.icon({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const HIMEAL_CENTER: [number, number] = [-7.434855, 109.2237517];

interface LeafletMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLat?: number;
  selectedLng?: number;
}

export default function LeafletMap({ onLocationSelect, selectedLat, selectedLng }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: selectedLat && selectedLng ? [selectedLat, selectedLng] : HIMEAL_CENTER,
      zoom: selectedLat ? 16 : 14,
      zoomControl: true,
      attributionControl: true,
      doubleClickZoom: false, // disable default double-click zoom so we can use it for pin
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // HiMeal origin marker (small, subtle)
    L.circleMarker(HIMEAL_CENTER, {
      radius: 6,
      color: "#4a7c59",
      fillColor: "#9dd3aa",
      fillOpacity: 0.8,
      weight: 2,
    }).addTo(map).bindTooltip("HiMeal", { permanent: false, direction: "top" });

    // Double-click to place/move pin
    map.on("dblclick", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker when selectedLat/selectedLng changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedLat !== undefined && selectedLng !== undefined) {
      if (markerRef.current) {
        markerRef.current.setLatLng([selectedLat, selectedLng]);
      } else {
        markerRef.current = L.marker([selectedLat, selectedLng], {
          draggable: true,
        }).addTo(map);

        markerRef.current.on("dragend", () => {
          const pos = markerRef.current?.getLatLng();
          if (pos) onLocationSelect(pos.lat, pos.lng);
        });
      }

      map.setView([selectedLat, selectedLng], Math.max(map.getZoom(), 16), { animate: true });
    } else {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }, [selectedLat, selectedLng, onLocationSelect]);

  return <div ref={containerRef} className="w-full h-full" />;
}
