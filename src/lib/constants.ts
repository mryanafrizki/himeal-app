export const HIMEAL_ORIGIN = {
  lat: -7.434855,
  lng: 109.2237517,
} as const;

export const WHATSAPP_NUMBER = "6287777527426";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
}

export type OrderType = "delivery" | "takeaway";

export const DELIVERY_CONFIG = {
  freeDistanceKm: 5,
  baseFeeIDR: 8000,       // biaya minimum 4km pertama (mirip GoFood Zona I)
  baseDistanceKm: 4,      // jarak yang tercover biaya minimum
  perKmIDR: 2000,         // Rp 2.000/km (Zona I batas bawah)
} as const;

export const HIMEAL_MAPS_EMBED = `https://maps.google.com/maps?q=${HIMEAL_ORIGIN.lat},${HIMEAL_ORIGIN.lng}&z=17&output=embed`;

export const ORDER_STATUS = {
  PENDING_PAYMENT: "pending_payment",
  PAYMENT_EXPIRED: "payment_expired",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  DELIVERING: "delivering",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Menunggu Pembayaran",
  payment_expired: "Pembayaran Kedaluwarsa",
  confirmed: "Pesanan Diterima",
  preparing: "Sedang Dimasak",
  delivering: "Sedang Diantar",
  delivered: "Selesai",
  cancelled: "Dibatalkan",
};

export const PAYMENT_EXPIRY_MINUTES = 15;

export const PREP_TIME_MINUTES = 10;
export const AVG_DELIVERY_SPEED_KMH = 30;

export function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}
