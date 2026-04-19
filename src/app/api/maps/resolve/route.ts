import { NextRequest, NextResponse } from "next/server";

/**
 * Resolve a Google Maps short link to get the full URL with coordinates.
 * Short links (maps.app.goo.gl) redirect to the full URL.
 * We follow the redirect and extract coordinates from the final URL.
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // Follow redirects to get the final URL
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    const finalUrl = res.url;

    // Extract coordinates from the final URL
    const coords = extractCoords(finalUrl);

    return NextResponse.json({
      finalUrl,
      coords,
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses link" },
      { status: 500 }
    );
  }
}

function extractCoords(url: string): { lat: number; lng: number } | null {
  // /@lat,lng
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  // ?q=lat,lng
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

  // /place/lat,lng
  const placeMatch = url.match(/\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };

  // data=...!3d{lat}!4d{lng}
  const dataMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (dataMatch) return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };

  return null;
}
