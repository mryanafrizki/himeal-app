import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import { getRevenueStats, getRevenueByPeriod } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "daily") as "daily" | "weekly" | "monthly";
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    if (!["daily", "weekly", "monthly"].includes(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const stats = getRevenueStats(from, to);
    const chartData = getRevenueByPeriod(period, from, to);

    return NextResponse.json({ stats, chartData });
  } catch (error) {
    console.error("[GET /api/admin/revenue]", error);
    return NextResponse.json(
      { error: "Failed to load revenue data" },
      { status: 500 }
    );
  }
}
