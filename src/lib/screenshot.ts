/**
 * Screenshot capture for URL analysis.
 * Tries local screenshot-service, falls back to thum.io API.
 */

/**
 * Take a screenshot of a URL.
 * Returns base64 data URI (image/jpeg) or null.
 */
export async function captureScreenshot(url: string): Promise<{ base64: string; source: string } | null> {
  // 1. Try local screenshot service (Playwright, port 3010 via gateway)
  try {
    const screenshotUrl = `/screenshot?url=${encodeURIComponent(url)}&width=1280&height=800&XTransformPort=3010`;
    const res = await fetch(screenshotUrl, {
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("image")) {
        const arrayBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        console.log("[screenshot] Local service OK, size:", Math.round(base64.length / 1024), "KB");
        return { base64: `data:image/jpeg;base64,${base64}`, source: "screenshot_service" };
      }
    }
    console.log("[screenshot] Local service returned non-image or error:", res.status);
  } catch (e) {
    console.log("[screenshot] Local service unavailable, trying fallback...");
  }

  // 2. Fallback: thum.io (works on Vercel, no auth needed)
  try {
    const thumbUrl = `https://image.thum.io/get/width/1280/crop/800/${encodeURIComponent(url)}`;
    const res = await fetch(thumbUrl, {
      signal: AbortSignal.timeout(25000),
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("image") || contentType.includes("gif")) {
        const arrayBuffer = await res.arrayBuffer();
        // thum.io returns actual PNG despite claiming gif
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        if (base64.length > 5000) { // Ignore tiny/empty responses
          console.log("[screenshot] thum.io fallback OK, size:", Math.round(base64.length / 1024), "KB");
          return { base64: `data:image/png;base64,${base64}`, source: "thum_io" };
        }
      }
    }
    console.log("[screenshot] thum.io fallback failed");
  } catch (e) {
    console.warn("[screenshot] thum.io failed:", e);
  }

  return null;
}
