function getAtlanticBaseUrl(): string {
  const raw = process.env.ATLANTIC_BASE_URL || "https://atlantich2h.com";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function getAtlanticApiKey(): string {
  return process.env.ATLANTIC_API_KEY || "";
}

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
  };
}

export interface DepositStatusResponse {
  status: boolean;
  message?: string;
  data?: {
    id: string;
    reff_id: string;
    nominal: number;
    status: "pending" | "success" | "expired";
  };
}

export async function createQRIS(
  reffId: string,
  nominal: number
): Promise<CreateDepositResponse> {
  const body = new URLSearchParams();
  body.append("api_key", getAtlanticApiKey());
  body.append("reff_id", reffId);
  body.append("nominal", nominal.toString());
  body.append("type", "ewallet");
  body.append("metode", "qris");

  const response = await fetch(`${getAtlanticBaseUrl()}/deposit/create`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Atlantic H2H error: ${response.status}`);
  }

  return response.json();
}

export async function checkPaymentStatus(
  atlanticId: string
): Promise<DepositStatusResponse> {
  const body = new URLSearchParams();
  body.append("api_key", getAtlanticApiKey());
  body.append("id", atlanticId);

  const response = await fetch(`${getAtlanticBaseUrl()}/deposit/status`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Atlantic H2H status check error: ${response.status}`);
  }

  const result = await response.json();
  console.log("[Atlantic] checkPaymentStatus raw response:", JSON.stringify(result));
  return result;
}

export async function cancelPayment(
  atlanticId: string
): Promise<{ status: boolean; message?: string }> {
  const body = new URLSearchParams();
  body.append("api_key", getAtlanticApiKey());
  body.append("id", atlanticId);

  const response = await fetch(`${getAtlanticBaseUrl()}/deposit/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Atlantic H2H cancel error: ${response.status}`);
  }

  return response.json();
}
