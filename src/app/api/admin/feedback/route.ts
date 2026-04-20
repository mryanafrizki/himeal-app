import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import { getAllFeedback } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = getAllFeedback(page, limit);
    const totalPages = Math.ceil(result.total / limit);

    return NextResponse.json({
      feedback: result.feedback,
      total: result.total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("[GET /api/admin/feedback]", error);
    return NextResponse.json(
      { error: "Failed to load feedback" },
      { status: 500 }
    );
  }
}
