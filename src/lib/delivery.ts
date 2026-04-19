import { HIMEAL_ORIGIN, DELIVERY_CONFIG } from "./constants";

/**
 * Calculate road distance using multiple routing providers.
 * Tries OSRM first, then OpenRouteService, then GraphHopper.
 * Throws if ALL providers fail - no Haversine fallback.
 */
export async function calculateRoadDistance(
  customerLat: number,
  customerLng: number
): Promise<number> {
  const osrmResult = await tryOSRM(customerLat, customerLng);
  if (osrmResult !== null) return osrmResult;

  const orsResult = await tryOpenRouteService(customerLat, customerLng);
  if (orsResult !== null) return orsResult;

  const ghResult = await tryGraphHopper(customerLat, customerLng);
  if (ghResult !== null) return ghResult;

  throw new Error(
    "Tidak dapat menghitung jarak pengantaran. Coba lagi nanti."
  );
}

async function tryOSRM(
  customerLat: number,
  customerLng: number
): Promise<number | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${HIMEAL_ORIGIN.lng},${HIMEAL_ORIGIN.lat};${customerLng},${customerLat}?overview=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.code === "Ok" && data.routes?.[0]) {
      return data.routes[0].distance / 1000;
    }
  } catch {
    // OSRM unavailable
  }
  return null;
}

async function tryOpenRouteService(
  customerLat: number,
  customerLng: number
): Promise<number | null> {
  try {
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${HIMEAL_ORIGIN.lng},${HIMEAL_ORIGIN.lat}&end=${customerLng},${customerLat}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json, application/geo+json" },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (data.features?.[0]?.properties?.summary?.distance) {
      return data.features[0].properties.summary.distance / 1000;
    }
  } catch {
    // ORS unavailable
  }
  return null;
}

async function tryGraphHopper(
  customerLat: number,
  customerLng: number
): Promise<number | null> {
  try {
    const url = `https://graphhopper.com/api/1/route?point=${HIMEAL_ORIGIN.lat},${HIMEAL_ORIGIN.lng}&point=${customerLat},${customerLng}&vehicle=car&calc_points=false&key=`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.paths?.[0]?.distance) {
      return data.paths[0].distance / 1000;
    }
  } catch {
    // GraphHopper unavailable
  }
  return null;
}

export function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= DELIVERY_CONFIG.freeDistanceKm) {
    return 0;
  }
  const extraKm = distanceKm - DELIVERY_CONFIG.freeDistanceKm;
  const tiers = Math.ceil(extraKm / DELIVERY_CONFIG.tierDistanceKm);
  return tiers * DELIVERY_CONFIG.feePerTierIDR;
}
