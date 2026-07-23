/**
 * Pinterest URL detection and oEmbed extraction.
 * Uses native fetch — NOT z-ai-web-dev-sdk.
 */

export function isPinterestPin(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "pinterest.com" || u.hostname.endsWith(".pinterest.com");
  } catch {
    return false;
  }
}

export interface PinterestPinData {
  title: string;
  authorName: string;
  authorUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

export async function fetchPinterestOembed(url: string): Promise<PinterestPinData | null> {
  try {
    const oembedUrl = `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    return {
      title: (data.title as string) || "",
      authorName: (data.author_name as string) || "",
      authorUrl: (data.author_url as string) || "",
      thumbnailUrl: (data.thumbnail_url as string) || "",
      width: (data.width as number) || 0,
      height: (data.height as number) || 0,
    };
  } catch (e) {
    console.warn("[pinterest] oEmbed fetch failed:", e);
    return null;
  }
}

/**
 * Download image to buffer via native fetch.
 * Returns base64 data URI string or null.
 */
export async function downloadImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    console.warn("[pinterest] image download failed:", e);
    return null;
  }
}
