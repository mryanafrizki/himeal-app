import { HIMEAL_ORIGIN, DELIVERY_CONFIG } from "./constants";

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

export function calculateDistanceFromHiMeal(
  customerLat: number,
  customerLng: number
): number {
  return haversineDistance(
    HIMEAL_ORIGIN.lat,
    HIMEAL_ORIGIN.lng,
    customerLat,
    customerLng
  );
}

export function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= DELIVERY_CONFIG.freeDistanceKm) {
    return 0;
  }
  const extraKm = distanceKm - DELIVERY_CONFIG.freeDistanceKm;
  const tiers = Math.ceil(extraKm / DELIVERY_CONFIG.tierDistanceKm);
  return tiers * DELIVERY_CONFIG.feePerTierIDR;
}

export function getDeliveryInfo(customerLat: number, customerLng: number) {
  const distanceKm = calculateDistanceFromHiMeal(customerLat, customerLng);
  const fee = calculateDeliveryFee(distanceKm);
  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    fee,
    isFree: fee === 0,
  };
}
