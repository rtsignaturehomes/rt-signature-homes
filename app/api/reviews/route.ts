import { NextResponse } from "next/server";

// Server-only Google Places integration. The API key lives exclusively in a
// server environment variable and is never returned to the client. The browser
// only ever calls this same-origin endpoint, which returns sanitized review data.
//
// Required env:  GOOGLE_PLACES_API_KEY  (server-side only)
// Optional env:  GOOGLE_PLACE_ID        (defaults to the verified RT Signature Homes Place ID)

export const dynamic = "force-dynamic"; // read env + fetch at runtime, not at build time

// Verified Place ID for "RT Signature Homes Design & Build - Kitchen & Bathroom Remodeling"
// (also used by the Leave-a-Review widget in components/ReviewWidget.tsx).
const DEFAULT_PLACE_ID = "ChIJ_Q1Bt8ptkFQR8mUyVjwRnvA";
const MIN_RATING = 4;
const REVALIDATE_SECONDS = 21600; // cache the upstream Google response for 6 hours
const UPSTREAM_TIMEOUT_MS = 7000; // Netlify functions stop at 10s

type GoogleReview = {
  author_name?: string;
  rating?: number;
  text?: string;
  relative_time_description?: string;
  time?: number;
  profile_photo_url?: string;
  author_url?: string;
};

const cacheOk = { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" };
const cacheShort = { "Cache-Control": "public, max-age=120" };

export async function GET() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    // Not configured yet — the client keeps the existing approved fallback reviews.
    return NextResponse.json({ status: "unconfigured" }, { headers: cacheShort });
  }

  const placeId = process.env.GOOGLE_PLACE_ID || DEFAULT_PLACE_ID;
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "reviews,rating,user_ratings_total");
  url.searchParams.set("reviews_sort", "newest");
  url.searchParams.set("language", "en");
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Places HTTP ${res.status}`);
    const data = (await res.json()) as {
      status?: string;
      error_message?: string;
      result?: { reviews?: GoogleReview[]; rating?: number; user_ratings_total?: number };
    };
    if (data.status !== "OK") throw new Error(`Places status ${data.status}${data.error_message ? `: ${data.error_message}` : ""}`);

    const reviews = (data.result?.reviews ?? [])
      .filter((r) => typeof r.rating === "number" && (r.rating as number) >= MIN_RATING && (r.text ?? "").trim())
      .map((r) => ({
        author: (r.author_name || "Google user").trim(),
        rating: Math.round(r.rating as number),
        text: (r.text || "").trim(),
        time: r.relative_time_description || "",
        timestamp: r.time || 0,
        authorUrl: r.author_url || "",
        photo: r.profile_photo_url || "",
      }));

    if (!reviews.length) {
      // API succeeded but nothing qualifies — the client hides the section.
      return NextResponse.json({ status: "empty" }, { headers: cacheOk });
    }

    return NextResponse.json(
      {
        status: "ok",
        rating: data.result?.rating ?? null,
        total: data.result?.user_ratings_total ?? null,
        reviews,
      },
      { headers: cacheOk },
    );
  } catch (error) {
    console.error("[reviews] Google Places fetch failed", error);
    // Signal failure so the client keeps the existing approved fallback reviews.
    return NextResponse.json({ status: "error" }, { headers: cacheShort });
  }
}
