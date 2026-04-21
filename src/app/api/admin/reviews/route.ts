import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import { getAllReviewsPaginated } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const result = getAllReviewsPaginated(page, limit);
    const totalPages = Math.ceil(result.total / limit);

    return NextResponse.json({
      reviews: result.reviews,
      total: result.total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("[GET /api/admin/reviews]", error);
    return NextResponse.json(
      { error: "Failed to load reviews" },
      { status: 500 }
    );
  }
}
