import { HIMEAL_ORIGIN, DELIVERY_CONFIG } from "./constants";

/**
 * Calculate road distance using OSRM (free, no API key).
 * Falls back to Haversine if OSRM fails.
 */
export async function calculateRoadDistance(
  customerLat: number,
  customerLng: number
): Promise<number> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${HIMEAL_ORIGIN.lng},${HIMEAL_ORIGIN.lat};${customerLng},${customerLat}?overview=false`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === "Ok" && data.routes?.[0]) {
      return data.routes[0].distance / 1000; // meters to km
    }
  } catch {
    // Fall back to haversine
  }
  return haversineDistance(
    HIMEAL_ORIGIN.lat,
    HIMEAL_ORIGIN.lng,
    customerLat,
    customerLng
  );
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= DELIVERY_CONFIG.freeDistanceKm) {
    return 0;
  }
  const extraKm = distanceKm - DELIVERY_CONFIG.freeDistanceKm;
  const tiers = Math.ceil(extraKm / DELIVERY_CONFIG.tierDistanceKm);
  return tiers * DELIVERY_CONFIG.feePerTierIDR;
}
