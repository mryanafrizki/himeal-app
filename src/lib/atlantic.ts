// Saweria Payment Gateway (replaces Atlantic H2H)

const BASE_URL = "https://saweria-pg.roubot71.workers.dev";

function getApiKey(): string {
  return process.env.SAWERIA_PG_API_KEY || process.env.ATLANTIC_API_KEY || "";
}

// ─── Random Donatur Data ────────────────────────────────

const NAMES = [
  "Rizki", "Dewi", "Andi", "Sari", "Budi", "Putri", "Fajar", "Nisa",
  "Dimas", "Ayu", "Raka", "Lina", "Yoga", "Mega", "Bayu", "Rina",
  "Arif", "Wulan", "Dani", "Tika", "Hendra", "Sinta", "Galih", "Indah",
  "Eko", "Ratna", "Agus", "Fitri", "Joko", "Yuni", "Wahyu", "Dina",
  "Rendi", "Citra", "Ilham", "Novi", "Surya", "Lia", "Adi", "Rini",
  "Taufik", "Anisa", "Feri", "Lestari", "Bambang", "Nurul", "Irfan",
  "Siti", "Rahmat", "Wati",
];

const DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "yahoo.co.id"];

const MESSAGES = [
  "Semangat terus!", "Sukses selalu kak", "Mantap kontennya",
  "Lanjutkan kak!", "Keren banget", "Semoga makin sukses",
  "Gas terus!", "Suka banget kontennya", "Terus berkarya",
  "Supportmu selalu", "Ditunggu konten selanjutnya", "Keren kak!",
  "Semangat kak", "Lanjut terus ya", "Mantap!", "Sukses terus",
  "Keep it up!", "Bagus banget", "Top!", "Salut kak",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDigits(len: number): string {
  let result = "";
  for (let i = 0; i < len; i++) result += Math.floor(Math.random() * 10);
  return result;
}

function generateDonatur() {
  const name = randomItem(NAMES);
  const domain = randomItem(DOMAINS);
  const email = `${name.toLowerCase()}${randomDigits(4)}@${domain}`;
  const message = randomItem(MESSAGES);
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
