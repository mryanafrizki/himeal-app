import { NextRequest, NextResponse } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "himeal2026";

export function validateAdmin(request: NextRequest): NextResponse | null {
  const key = request.headers.get("x-admin-key");
  if (key !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
