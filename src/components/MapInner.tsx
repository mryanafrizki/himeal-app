"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const HIMEAL_ORIGIN: [number, number] = [-7.4316, 109.2349];

const originIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "origin-marker",
});

interface MapInnerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLat?: number;
  selectedLng?: number;
}

function ClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapUpdater({
  selectedLat,
  selectedLng,
}: {
  selectedLat?: number;
  selectedLng?: number;
}) {
  const map = useMapEvents({});

  useEffect(() => {
    if (selectedLat !== undefined && selectedLng !== undefined) {
      map.flyTo([selectedLat, selectedLng], map.getZoom(), {
        duration: 0.5,
      });
    }
  }, [selectedLat, selectedLng, map]);

  return null;
}

export default function MapInner({
  onLocationSelect,
  selectedLat,
  selectedLng,
}: MapInnerProps) {
  return (
    <MapContainer
      center={HIMEAL_ORIGIN}
      zoom={14}
      className="h-full w-full"
      style={{ minHeight: "300px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* HiMeal origin marker */}
      <Marker position={HIMEAL_ORIGIN} icon={originIcon} />

      {/* User delivery pin */}
      {selectedLat !== undefined && selectedLng !== undefined && (
        <Marker position={[selectedLat, selectedLng]} />
      )}

      <ClickHandler onLocationSelect={onLocationSelect} />
      <MapUpdater selectedLat={selectedLat} selectedLng={selectedLng} />
    </MapContainer>
  );
}
