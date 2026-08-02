/**
 * Image Adapter — handles uploaded images and direct image URLs.
 * Refactored from fetch-source.ts image upload + image URL branches.
 */

import type { SourceAdapter, FetchContext, FetchResult } from "./types";
import { isImageUrlSafe } from "@/lib/url-safety";
import { downloadImageAsBase64 } from "@/lib/pinterest";

export class ImageAdapter implements SourceAdapter {
  readonly type = "image" as const;
  readonly label = "Image";
  readonly canFetchHtml = false;
  readonly canExtractRsc = false;
  readonly hasMultiplePages = false;
  readonly hasSourceCode = false;
  readonly category = "visual" as const;

  async fetch(ctx: FetchContext): Promise<FetchResult> {
    // Case 1: Uploaded image (base64 provided)
    if (ctx.imageBase64) {
      return {
        images: [{ base64: ctx.imageBase64, alt: ctx.imageFileName || "uploaded image" }],
        metadata: {
          title: ctx.imageFileName || "Uploaded Image",
          originalUrl: undefined,
        },
      };
    }

    // Case 2: Direct image URL — download it
    if (ctx.urls.length > 0) {
      const url = ctx.urls[0];
      if (isImageUrlSafe(url)) {
        try {
          const imgBase64 = await downloadImageAsBase64(url);
          if (imgBase64) {
            return {
              images: [{ base64: imgBase64, url, alt: url }],
              metadata: {
                title: url.split("/").pop() || "Image",
                originalUrl: url,
              },
            };
          }
        } catch (e) {
          console.warn("[image-adapter] Download failed:", e);
        }
      }
    }

    // Fallback: no image available
    return {
      images: [],
      metadata: { title: "Image" },
    };
  }

  extraSteps() {
    return [];
  }
}
