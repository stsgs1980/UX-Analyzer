/**
 * Pinterest Board Adapter — handles Pinterest board URLs with multiple pins.
 *
 * Fetch strategy: Scrape the board page, extract individual pin URLs,
 * then download thumbnails for up to 10 pins in parallel.
 *
 * URL pattern: pinterest.com/<user>/boards/<board-name>/
 */

import type { SourceAdapter, FetchContext, FetchResult } from "./types";
import { withTimeout } from "@/lib/pipeline/helpers";
import { isPinterestPin, fetchPinterestOembed, downloadImageAsBase64 } from "@/lib/pinterest";

/** Maximum number of pins to process from a board */
const MAX_PINS = 10;

export class PinterestBoardAdapter implements SourceAdapter {
  readonly type = "pinterest-board" as const;
  readonly label = "Pinterest Board";
  readonly canFetchHtml = false;
  readonly canExtractRsc = false;
  readonly hasMultiplePages = false;
  readonly hasSourceCode = false;
  readonly category = "visual" as const;

  async fetch(ctx: FetchContext): Promise<FetchResult> {
    const url = ctx.urls[0];
    if (!url) {
      return { images: [], metadata: { title: "Pinterest Board" } };
    }

    try {
      // Step 1: Fetch the board page to extract pin URLs
      const r = await withTimeout(
        ctx.zai.functions.invoke("page_reader", { url }),
        15000,
        "pinterest-board-reader"
      );

      const html = (r as any)?.data?.html || "";
      const title = (r as any)?.data?.title || "Pinterest Board";

      // Extract pin URLs from the board page
      // Pinterest uses data-pin-href or links to /pin/<id>/
      const pinUrls: string[] = [];
      const pinUrlRegex = /href=["'](https?:\/\/(?:www\.)?pinterest\.[a-z]+\/pin\/\d+\/?)/gi;
      let match;
      while ((match = pinUrlRegex.exec(html)) !== null) {
        if (!pinUrls.includes(match[1])) {
          pinUrls.push(match[1]);
          if (pinUrls.length >= MAX_PINS) break;
        }
      }

      // Fallback: look for pin URLs in different format
      if (pinUrls.length === 0) {
        const altPinRegex = /\/pin\/(\d+)/g;
        while ((match = altPinRegex.exec(html)) !== null) {
          const fullUrl = `https://www.pinterest.com/pin/${match[1]}/`;
          if (!pinUrls.includes(fullUrl)) {
            pinUrls.push(fullUrl);
            if (pinUrls.length >= MAX_PINS) break;
          }
        }
      }

      // Step 2: Download thumbnails for up to 10 pins in parallel
      const images: FetchResult["images"] = [];
      const pinTitles: string[] = [];

      if (pinUrls.length > 0) {
        console.log(`[pinterest-board] Found ${pinUrls.length} pins, downloading thumbnails...`);

        const results = await Promise.allSettled(
          pinUrls.slice(0, MAX_PINS).map(async (pinUrl) => {
            try {
              const pinData = await withTimeout(
                fetchPinterestOembed(pinUrl),
                8000,
                "board-pin-oembed"
              );
              if (pinData?.thumbnailUrl) {
                const imgBase64 = await withTimeout(
                  downloadImageAsBase64(pinData.thumbnailUrl),
                  15000,
                  "board-pin-image"
                );
                if (imgBase64) {
                  images.push({
                    base64: imgBase64,
                    url: pinData.thumbnailUrl,
                    alt: pinData.title || "Pinterest pin",
                  });
                  if (pinData.title) pinTitles.push(pinData.title);
                }
              }
            } catch (e) {
              console.warn("[pinterest-board] Pin fetch failed:", pinUrl, e);
            }
          })
        );

        const successCount = results.filter(r => r.status === "fulfilled").length;
        console.log(`[pinterest-board] Downloaded ${successCount}/${pinUrls.length} pin thumbnails`);
      }

      return {
        images,
        metadata: {
          title: title.replace(" on Pinterest", "").trim() || "Pinterest Board",
          thumbnailUrl: images[0]?.url,
          originalUrl: url,
          extra: {
            pinCount: pinUrls.length,
            pinTitles,
          },
        },
      };
    } catch (e) {
      console.warn("[pinterest-board-adapter] Fetch failed:", e);
      return {
        images: [],
        metadata: { title: "Pinterest Board", originalUrl: url },
      };
    }
  }

  extraSteps() {
    return [];
  }
}
