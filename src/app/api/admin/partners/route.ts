import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { validateAdmin } from "@/lib/admin";
import { getAllPartners, createPartner } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const partners = getAllPartners();
    return NextResponse.json(partners);
  } catch (error) {
    console.error("[GET /api/admin/partners]", error);
    return NextResponse.json(
      { error: "Failed to load partners" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const id = "partner-" + nanoid(8);

    const partner = createPartner({
      id,
      name: body.name.trim(),
      logo_url: (body.logoUrl || "").trim(),
      link_url: (body.linkUrl || "").trim(),
      sort_order: body.sort_order,
    });

    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/partners]", error);
    return NextResponse.json(
      { error: "Failed to create partner" },
      { status: 500 }
    );
  }
}
