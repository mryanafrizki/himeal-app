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

/**
 * Delivery fee model (mirip GoFood/GrabFood Zona I):
 * - Free ongkir: 0-5 km (subsidi dari HiMeal)
 * - 5-9 km: biaya minimum Rp 8.000 (base fee untuk 4km pertama setelah free zone)
 * - 9+ km: Rp 8.000 + Rp 2.000 per km tambahan
 */
export function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= DELIVERY_CONFIG.freeDistanceKm) {
    return 0;
  }

  const chargeableKm = distanceKm - DELIVERY_CONFIG.freeDistanceKm;

  if (chargeableKm <= DELIVERY_CONFIG.baseDistanceKm) {
    return DELIVERY_CONFIG.baseFeeIDR;
  }

  const extraKm = chargeableKm - DELIVERY_CONFIG.baseDistanceKm;
  return DELIVERY_CONFIG.baseFeeIDR + Math.ceil(extraKm) * DELIVERY_CONFIG.perKmIDR;
}
