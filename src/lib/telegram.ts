const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendTelegramNotification(
  message: string
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("[Telegram] Missing token or chat_id, skipping notification");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error("[Telegram] Notification failed:", err);
  }
}

export interface OrderNotificationData {
  orderId: string;
  customerAddress: string;
  items: Array<{ name: string; qty: number; price: number }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  distanceKm: number;
}

export function buildNewOrderMessage(data: OrderNotificationData): string {
  const itemLines = data.items
    .map(
      (i) =>
        `  - ${escapeHtml(i.name)} x${i.qty} = Rp ${(i.price * i.qty).toLocaleString("id-ID")}`
    )
    .join("\n");

  return `<b>PESANAN BARU</b>

<b>Order:</b> <code>${escapeHtml(data.orderId)}</code>
<b>Alamat:</b> ${escapeHtml(data.customerAddress)}
<b>Jarak:</b> ${data.distanceKm} km

<b>Items:</b>
${itemLines}

<b>Subtotal:</b> Rp ${data.subtotal.toLocaleString("id-ID")}
<b>Ongkir:</b> Rp ${data.deliveryFee.toLocaleString("id-ID")}
<b>Total:</b> <b>Rp ${data.total.toLocaleString("id-ID")}</b>`;
}

export function buildPaymentConfirmedMessage(
  orderId: string,
  total: number
): string {
  return `<b>PEMBAYARAN BERHASIL</b>

<b>Order:</b> <code>${escapeHtml(orderId)}</code>
<b>Total:</b> Rp ${total.toLocaleString("id-ID")}

Segera proses pesanan ini.`;
}

export function buildStatusChangeMessage(
  orderId: string,
  newStatus: string
): string {
  return `<b>STATUS UPDATE</b>

<b>Order:</b> <code>${escapeHtml(orderId)}</code>
<b>Status:</b> <b>${escapeHtml(newStatus)}</b>`;
}
