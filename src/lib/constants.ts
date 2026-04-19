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

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "grilled-chicken-salad",
    name: "Grilled Chicken Salad",
    price: 20000,
    description:
      "Fresh mixed greens topped with tender grilled chicken breast, cherry tomatoes, and our signature dressing.",
    image: "/menu/salad.jpg",
  },
  {
    id: "grilled-chicken-kebab",
    name: "Grilled Chicken Kebab",
    price: 16000,
    description:
      "Juicy grilled chicken skewers wrapped in warm flatbread with fresh vegetables and garlic sauce.",
    image: "/menu/kebab.jpg",
  },
];

export const DELIVERY_CONFIG = {
  freeDistanceKm: 5,
  feePerTierIDR: 5000,
  tierDistanceKm: 10,
} as const;

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
