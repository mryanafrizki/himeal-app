import { HIMEAL_ORIGIN, DELIVERY_CONFIG } from "./constants";

const ORS_API_KEY =
  process.env.ORS_API_KEY ||
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjZlYTBkZTFjMjI1OTRhMTI5NTMzMzRlMjFmMTE2YzhmIiwiaCI6Im11cm11cjY0In0=";

/**
 * Calculate road distance using OpenRouteService.
 * No fallback - throws on failure.
 */
export async function calculateRoadDistance(
  customerLat: number,
  customerLng: number
): Promise<number> {
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${HIMEAL_ORIGIN.lng},${HIMEAL_ORIGIN.lat}&end=${customerLng},${customerLat}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json, application/geo+json",
      Authorization: ORS_API_KEY,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Gagal menghitung jarak: ${res.status}`);
  }

  const data = await res.json();
  const distance = data.features?.[0]?.properties?.summary?.distance;
  if (typeof distance !== "number") {
    throw new Error("Tidak dapat menghitung jarak pengantaran.");
  }

  return distance / 1000;
}

export function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= DELIVERY_CONFIG.freeDistanceKm) {
    return 0;
  }
  const extraKm = distanceKm - DELIVERY_CONFIG.freeDistanceKm;
  const tiers = Math.ceil(extraKm / DELIVERY_CONFIG.tierDistanceKm);
  return tiers * DELIVERY_CONFIG.feePerTierIDR;
}
