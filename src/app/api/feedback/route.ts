import { NextRequest, NextResponse } from "next/server";
import { createFeedback, getFeedbackRateLimit } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.subject || typeof body.subject !== "string" || body.subject.trim().length === 0) {
      return NextResponse.json({ error: "Subjek wajib diisi" }, { status: 400 });
    }
    if (!body.email || typeof body.email !== "string" || !body.email.includes("@")) {
      return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
    }
    if (!body.message || typeof body.message !== "string" || body.message.trim().length === 0) {
      return NextResponse.json({ error: "Pesan wajib diisi" }, { status: 400 });
    }

    // Get IP address
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    // Rate limit: max 3 per IP per hour
    if (ip !== "unknown") {
      const recentCount = getFeedbackRateLimit(ip, 1);
      if (recentCount >= 3) {
        return NextResponse.json(
          { error: "Terlalu banyak feedback. Coba lagi nanti." },
          { status: 429 }
        );
      }
    }

    const userAgent = request.headers.get("user-agent") || null;

    const feedback = createFeedback({
      subject: body.subject.trim(),
      email: body.email.trim(),
      message: body.message.trim(),
      ip_address: ip,
      user_agent: userAgent,
    });

    return NextResponse.json({ success: true, id: feedback.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/feedback]", error);
    return NextResponse.json(
      { error: "Gagal mengirim feedback" },
      { status: 500 }
    );
  }
}
