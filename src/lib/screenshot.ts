/**
 * Screenshot capture for URL analysis.
 * Tries local screenshot-service (fullPage), falls back to viewport, then thum.io.
 */

const FULL_PAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB — vision-model limit
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 800;

/**
 * Fetch image from local screenshot service (Playwright via gateway on port 3010).
 * Returns base64 data URI or null.
 */
async function fetchLocalScreenshot(
  url: string,
  fullPage: boolean,
): Promise<{ base64: string; source: string } | null> {
  try {
    let screenshotUrl = `/screenshot?url=${encodeURIComponent(url)}&width=${VIEWPORT_WIDTH}`;
    if (fullPage) {
      screenshotUrl += `&fullPage=true`;
    } else {
      screenshotUrl += `&height=${VIEWPORT_HEIGHT}`;
    }
    screenshotUrl += `&XTransformPort=3010`;

    const res = await fetch(screenshotUrl, {
      signal: AbortSignal.timeout(45000),
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('image')) {
        const arrayBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const sizeKB = Math.round(base64.length / 1024);
        console.log(
          `[screenshot] Local service OK (${fullPage ? 'fullPage' : 'viewport'}), size: ${sizeKB} KB`,
        );
        return {
          base64: `data:image/jpeg;base64,${base64}`,
          source: fullPage ? 'screenshot_fullpage' : 'screenshot_viewport',
        };
      }
    }
    console.log('[screenshot] Local service returned non-image or error:', res.status);
  } catch (e) {
    console.log('[screenshot] Local service unavailable:', e instanceof Error ? e.message : e);
  }
  return null;
}

/**
 * Fallback: thum.io (works on Vercel, no auth needed). Viewport only.
 */
async function fetchThumIo(url: string): Promise<{ base64: string; source: string } | null> {
  try {
    const thumbUrl = `https://image.thum.io/get/width/${VIEWPORT_WIDTH}/crop/${VIEWPORT_HEIGHT}/${encodeURIComponent(url)}`;
    const res = await fetch(thumbUrl, {
      signal: AbortSignal.timeout(25000),
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('image') || contentType.includes('gif')) {
        const arrayBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        if (base64.length > 5000) {
          console.log(
            '[screenshot] thum.io fallback OK, size:',
            Math.round(base64.length / 1024),
            'KB',
          );
          return { base64: `data:image/png;base64,${base64}`, source: 'thum_io' };
        }
      }
    }
    console.log('[screenshot] thum.io fallback failed');
  } catch (e) {
    console.warn('[screenshot] thum.io failed:', e);
  }
  return null;
}

/**
 * Take a screenshot of a URL.
 * Strategy: fullPage → if too large → viewport → thum.io fallback.
 * Returns base64 data URI (image/jpeg) or null.
 */
export async function captureScreenshot(
  url: string,
): Promise<{ base64: string; source: string } | null> {
  // 1. Try fullPage capture
  const fullPage = await fetchLocalScreenshot(url, true);
  if (fullPage) {
    const sizeBytes = Math.round((fullPage.base64.length * 3) / 4);
    if (sizeBytes <= FULL_PAGE_MAX_BYTES) {
      return fullPage;
    }
    console.log(
      `[screenshot] Full-page too large (${Math.round(sizeBytes / 1024)} KB), trying viewport...`,
    );
  }

  // 2. Fallback: viewport-only (smaller, always fits vision model)
  const viewport = await fetchLocalScreenshot(url, false);
  if (viewport) {
    return viewport;
  }

  // 3. Last resort: thum.io
  return fetchThumIo(url);
}
