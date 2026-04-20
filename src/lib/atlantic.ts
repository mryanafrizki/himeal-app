// Saweria Payment Gateway (replaces Atlantic H2H)

const BASE_URL = "https://saweria-pg.roubot71.workers.dev";

function getApiKey(): string {
  return process.env.SAWERIA_PG_API_KEY || process.env.ATLANTIC_API_KEY || "";
}

// ─── Scrambled Random Donatur Data ──────────────────────

// Base syllables — combined randomly to create unique names
const SYLLABLES = [
  "ri", "ki", "de", "wi", "an", "di", "sa", "bu", "pu", "tri",
  "fa", "jar", "ni", "ma", "di", "yu", "ra", "ka", "li", "na",
  "yo", "ga", "me", "ba", "ri", "ar", "if", "wu", "lan", "da",
  "ti", "hen", "sin", "ta", "ga", "lih", "in", "dah", "ek", "ko",
  "rat", "ag", "us", "fit", "jo", "yu", "wah", "di", "ren",
  "ci", "tra", "il", "ham", "no", "vi", "sur", "ya", "li", "ad",
  "tau", "fik", "fe", "les", "bam", "bang", "nu", "rul", "ir", "fan",
  "si", "ti", "rah", "mat", "wa", "zi", "kri", "ja", "ki",
];

const DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "yahoo.co.id", "icloud.com", "proton.me", "mail.com"];

// Base words — shuffled and recombined into messages
const MSG_WORDS = [
  ["semangat", "terus", "kak", "selalu", "sukses", "mantap", "lanjutkan", "keren"],
  ["banget", "gas", "suka", "kontennya", "berkarya", "support", "ditunggu", "bagus"],
  ["top", "salut", "hebat", "lanjut", "ya", "oke", "sip", "joss", "wow", "nice"],
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDigits(len: number): string {
  let result = "";
  for (let i = 0; i < len; i++) result += Math.floor(Math.random() * 10);
  return result;
}

// Generate a scrambled name from syllables (2-3 syllables combined)
function scrambleName(): string {
  const count = randomInt(2, 3);
  const used = new Set<number>();
  let name = "";
  for (let i = 0; i < count; i++) {
    let idx: number;
    do { idx = randomInt(0, SYLLABLES.length - 1); } while (used.has(idx));
    used.add(idx);
    name += SYLLABLES[idx];
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Generate a scrambled message from word pools
function scrambleMessage(): string {
  const wordCount = randomInt(2, 4);
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    const pool = MSG_WORDS[randomInt(0, MSG_WORDS.length - 1)];
    const word = randomItem(pool);
    if (!words.includes(word)) words.push(word);
  }
  if (words.length === 0) words.push("semangat");
  const msg = words.join(" ");
  // Randomly add ! or nothing
  return msg.charAt(0).toUpperCase() + msg.slice(1) + (Math.random() > 0.4 ? "!" : "");
}

function generateDonatur() {
  const name = scrambleName();
  const domain = randomItem(DOMAINS);
  // Email: scrambled name (lowercase, no spaces) + random digits
  const emailName = scrambleName().toLowerCase() + randomDigits(randomInt(2, 5));
  const email = `${emailName}@${domain}`;
  const message = scrambleMessage();
  return { name, email, message };
}

// ─── Types ──────────────────────────────────────────────

export interface CreateDepositResponse {
  status: boolean;
  message?: string;
  data?: {
    id: string;
    reff_id: string;
    nominal: number;
    tambahan: number;
    fee: number;
    get_balance: number;
    qr_string: string;
    qr_image: string;
    status: "pending" | "success" | "expired";
    created_at: string;
    expired_at: string;
    // Saweria PG fields
    transaction_id?: string;
    saweria_payment_id?: string;
    payment_type?: string;
  };
}

export interface DepositStatusResponse {
  status: boolean;
  message?: string;
  data?: {
    id: string;
    reff_id: string;
    nominal: number;
    status: "pending" | "success" | "expired" | "paid" | "failed";
    transaction_id?: string;
    amount?: number;
    paid_at?: string;
  };
}

// ─── Create QRIS ────────────────────────────────────────

export async function createQRIS(
  reffId: string,
  nominal: number
): Promise<CreateDepositResponse> {
  const donatur = generateDonatur();

  const response = await fetch(`${BASE_URL}/api/v1/payment`, {
    method: "POST",
    headers: {
      "X-API-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: nominal,
      message: donatur.message,
      customer_name: donatur.name,
      customer_email: donatur.email,
      reference_id: reffId,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Saweria PG error ${response.status}: ${text}`);
  }

  const result = await response.json();

  // Normalize response to match existing interface
  if (result.success && result.data) {
    return {
      status: true,
      message: result.message,
      data: {
        id: result.data.transaction_id || result.data.saweria_payment_id || "",
        reff_id: reffId,
        nominal: result.data.amount || nominal,
        tambahan: 0,
        fee: 0,
        get_balance: 0,
        qr_string: result.data.qr_string || "",
        qr_image: "",
        status: "pending",
        created_at: result.data.created_at || new Date().toISOString(),
        expired_at: "",
        transaction_id: result.data.transaction_id,
        saweria_payment_id: result.data.saweria_payment_id,
        payment_type: result.data.payment_type,
      },
    };
  }

  return {
    status: false,
    message: result.message || "Payment creation failed",
  };
}

// ─── Check Status ───────────────────────────────────────

export async function checkPaymentStatus(
  transactionId: string
): Promise<DepositStatusResponse> {
  const response = await fetch(`${BASE_URL}/api/v1/payment/${transactionId}`, {
    headers: { "X-API-Key": getApiKey() },
  });

  if (!response.ok) {
    throw new Error(`Saweria PG status check error: ${response.status}`);
  }

  const result = await response.json();
  console.log("[SaweriaPG] checkPaymentStatus raw response:", JSON.stringify(result));

  if (result.success && result.data) {
    // Map "paid" → "success" for compatibility
    const rawStatus = result.data.status;
    const normalizedStatus = rawStatus === "paid" ? "success" : rawStatus;

    return {
      status: true,
      data: {
        id: result.data.transaction_id || transactionId,
        reff_id: "",
        nominal: result.data.amount || 0,
        status: normalizedStatus,
        transaction_id: result.data.transaction_id,
        paid_at: result.data.paid_at,
      },
    };
  }

  return {
    status: false,
    message: result.message || "Status check failed",
  };
}

// ─── Cancel (no-op for Saweria PG) ─────────────────────

export async function cancelPayment(
  _transactionId: string
): Promise<{ status: boolean; message?: string }> {
  // Saweria PG doesn't have a cancel endpoint — QR expires naturally
  return { status: true, message: "Payment will expire automatically" };
}
