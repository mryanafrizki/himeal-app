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

/** Send a new Telegram message. Returns the message_id or null. */
export async function sendTelegramNotification(
  message: string
): Promise<number | null> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("[Telegram] Missing token or chat_id, skipping notification");
    return null;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });
    const data = await res.json();
    if (data.ok && data.result?.message_id) {
      return data.result.message_id as number;
    }
    return null;
  } catch (err) {
    console.error("[Telegram] Notification failed:", err);
    return null;
  }
}

/** Edit an existing Telegram message. Returns true on success. */
export async function editTelegramMessage(
  messageId: number,
  message: string
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !messageId) {
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        message_id: messageId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch (err) {
    console.error("[Telegram] Edit failed:", err);
    return false;
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

/** Build the full order message with optional status timeline appended. */
export function buildOrderMessage(
  data: OrderNotificationData,
  statusTimeline?: { status: string; time: string }[]
): string {
  const isDelivery = data.orderType !== "takeaway";
  const typeLabel = isDelivery ? "DELIVERY" : "PICKUP";
  const typeIcon = isDelivery ? "\u{1F6F5}" : "\u{1F3EA}";

  const itemLines = data.items
    .map((i) => {
      let line = `    ${esc(i.name)}  x${i.qty}  <b>${fmtRp(i.price * i.qty)}</b>`;
      if (i.notes) line += `\n    <i>    "${esc(i.notes)}"</i>`;
      return line;
    })
    .join("\n");

  let msg = `${typeIcon} <b>PESANAN - ${typeLabel}</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

<b>ID Pesanan</b>
<code>${esc(data.orderId)}</code>

\u{1F464} <b>PEMESAN</b>
    Nama: <b>${esc(data.customerName)}</b>
    WA: <b>${esc(data.customerPhone)}</b>

\u{1F4CD} <b>${isDelivery ? "PENGANTARAN" : "PENGAMBILAN"}</b>
    ${esc(data.customerAddress)}`;

  if (data.addressNotes) {
    msg += `\n    <i>"${esc(data.addressNotes)}"</i>`;
  }

  if (data.customerLat && data.customerLng) {
    msg += `\n    <a href="https://maps.google.com/maps?q=${data.customerLat},${data.customerLng}">\u{1F4CC} Buka Google Maps</a>`;
  }

  if (isDelivery && data.distanceKm > 0) {
    msg += `\n    Jarak: <b>${data.distanceKm} km</b>`;
  }

  msg += `

\u{1F37D} <b>PESANAN</b>
${itemLines}

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
    Subtotal:     ${fmtRp(data.subtotal)}
    Ongkir:         ${data.deliveryFee === 0 ? "<b>GRATIS</b>" : fmtRp(data.deliveryFee)}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
    <b>TOTAL:        ${fmtRp(data.total)}</b>`;

  // Append status timeline if provided
  if (statusTimeline && statusTimeline.length > 0) {
    const statusIcons: Record<string, string> = {
      confirmed: "\u2705",
      preparing: "\u{1F468}\u200D\u{1F373}",
      ready: "\u{1F4E6}",
      delivering: "\u{1F6F5}",
      delivered: "\u{1F389}",
      cancelled: "\u274C",
    };
    msg += `\n\n\u{1F4CB} <b>STATUS</b>`;
    for (const entry of statusTimeline) {
      const icon = statusIcons[entry.status] || "\u{1F4CB}";
      msg += `\n    ${icon} ${esc(entry.status.toUpperCase())}  <i>${esc(entry.time)}</i>`;
    }
  }

  return msg;
}

/** Legacy: build new order message (calls buildOrderMessage without timeline) */
export function buildNewOrderMessage(data: OrderNotificationData): string {
  return buildOrderMessage(data);
}

/** Legacy: build status change message (kept for fallback when no telegram_message_id) */
export function buildStatusChangeMessage(
  orderId: string,
  newStatus: string,
  customerName: string
): string {
  const statusIcons: Record<string, string> = {
    confirmed: "\u2705",
    preparing: "\u{1F468}\u200D\u{1F373}",
    ready: "\u{1F4E6}",
    delivering: "\u{1F6F5}",
    delivered: "\u{1F389}",
    cancelled: "\u274C",
  };
  const icon = statusIcons[newStatus] || "\u{1F4CB}";

  return `${icon} <b>STATUS UPDATE</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

<b>ID Pesanan</b>
<code>${esc(orderId)}</code>

Pelanggan: <b>${esc(customerName)}</b>
Status: <b>${esc(newStatus.toUpperCase())}</b>`;
}
