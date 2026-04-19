const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

function esc(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtRp(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
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
        disable_web_page_preview: false,
      }),
    });
  } catch (err) {
    console.error("[Telegram] Notification failed:", err);
  }
}

export interface OrderNotificationData {
  orderId: string;
  orderType: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  addressNotes?: string | null;
  customerLat?: number | null;
  customerLng?: number | null;
  items: Array<{ name: string; qty: number; price: number; notes?: string | null }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  distanceKm: number;
}

export function buildNewOrderMessage(data: OrderNotificationData): string {
  const isDelivery = data.orderType !== "takeaway";
  const typeLabel = isDelivery ? "DELIVERY" : "TAKEAWAY";
  const typeIcon = isDelivery ? "🛵" : "🏪"; // only in telegram, not in web UI

  const itemLines = data.items
    .map((i) => {
      let line = `    ${esc(i.name)}  x${i.qty}  <b>${fmtRp(i.price * i.qty)}</b>`;
      if (i.notes) line += `\n    <i>    "${esc(i.notes)}"</i>`;
      return line;
    })
    .join("\n");

  let msg = `${typeIcon} <b>PESANAN BARU - ${typeLabel}</b>
━━━━━━━━━━━━━━━━━━━━

<b>ID Pesanan</b>
<code>${esc(data.orderId)}</code>

👤 <b>PEMESAN</b>
    Nama: <b>${esc(data.customerName)}</b>
    WA: <b>${esc(data.customerPhone)}</b>

📍 <b>PENGANTARAN</b>
    ${esc(data.customerAddress)}`;

  if (data.addressNotes) {
    msg += `\n    <i>"${esc(data.addressNotes)}"</i>`;
  }

  if (data.customerLat && data.customerLng) {
    msg += `\n    <a href="https://maps.google.com/maps?q=${data.customerLat},${data.customerLng}">📌 Buka Google Maps</a>`;
  }

  if (isDelivery && data.distanceKm > 0) {
    msg += `\n    Jarak: <b>${data.distanceKm} km</b>`;
  }

  msg += `

🍽 <b>PESANAN</b>
${itemLines}

━━━━━━━━━━━━━━━━━━━━
    Subtotal:     ${fmtRp(data.subtotal)}
    Ongkir:         ${data.deliveryFee === 0 ? "<b>GRATIS</b>" : fmtRp(data.deliveryFee)}
━━━━━━━━━━━━━━━━━━━━
    <b>TOTAL:        ${fmtRp(data.total)}</b>`;

  return msg;
}

export function buildPaymentConfirmedMessage(
  orderId: string,
  total: number,
  customerName: string
): string {
  return `✅ <b>PEMBAYARAN BERHASIL</b>
━━━━━━━━━━━━━━━━━━━━

<b>ID Pesanan</b>
<code>${esc(orderId)}</code>

Pelanggan: <b>${esc(customerName)}</b>
Total: <b>${fmtRp(total)}</b>

⚡ <b>Segera proses pesanan ini!</b>`;
}

export function buildStatusChangeMessage(
  orderId: string,
  newStatus: string,
  customerName: string
): string {
  const statusIcons: Record<string, string> = {
    confirmed: "✅",
    preparing: "👨‍🍳",
    delivering: "🛵",
    delivered: "🎉",
    cancelled: "❌",
  };
  const icon = statusIcons[newStatus] || "📋";

  return `${icon} <b>STATUS UPDATE</b>
━━━━━━━━━━━━━━━━━━━━

<b>ID Pesanan</b>
<code>${esc(orderId)}</code>

Pelanggan: <b>${esc(customerName)}</b>
Status: <b>${esc(newStatus.toUpperCase())}</b>`;
}
