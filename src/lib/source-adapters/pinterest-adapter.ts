/**
 * Pinterest Pin Adapter — handles single Pinterest pin URLs.
 * Refactored from fetch-source.ts pinterest branch + pinterest.ts.
 */

import type { SourceAdapter, FetchContext, FetchResult } from "./types";
import { isPinterestPin, fetchPinterestOembed, downloadImageAsBase64 } from "@/lib/pinterest";

export class PinterestAdapter implements SourceAdapter {
  readonly type = "pinterest" as const;
  readonly label = "Pinterest Pin";
  readonly canFetchHtml = false;
  readonly canExtractRsc = false;
  readonly hasMultiplePages = false;
  readonly hasSourceCode = false;
  readonly category = "visual" as const;

  async fetch(ctx: FetchContext): Promise<FetchResult> {
    const images: FetchResult["images"] = [];

    for (const url of ctx.urls) {
      if (!isPinterestPin(url)) continue;

      try {
        const pinData = await fetchPinterestOembed(url);
        console.log("[pinterest-adapter] oEmbed result:", pinData ? `OK (title: ${pinData.title})` : "NULL");

        if (pinData) {
          // Download thumbnail image
          if (pinData.thumbnailUrl) {
            try {
              const imgBase64 = await downloadImageAsBase64(pinData.thumbnailUrl);
              if (imgBase64) {
                images.push({
                  base64: imgBase64,
                  url: pinData.thumbnailUrl,
                  alt: pinData.title || "Pinterest pin",
                });
              }
            } catch (e) {
              console.warn("[pinterest-adapter] Thumbnail download failed:", e);
            }
          }

          return {
            images,
            metadata: {
              title: pinData.title || "Pinterest Pin",
              author: pinData.authorName,
              authorUrl: pinData.authorUrl,
              thumbnailUrl: pinData.thumbnailUrl,
              originalUrl: url,
              extra: {
                width: pinData.width,
                height: pinData.height,
              },
            },
          };
        }
      } catch (e) {
        console.warn("[pinterest-adapter] Failed:", e);
      }
    }

    // Fallback if oEmbed fails
    return {
      images,
      metadata: { title: "Pinterest Pin", originalUrl: ctx.urls[0] },
    };
  }

  extraSteps() {
    return [];
  }
}
