/**
 * Behance Adapter — handles Behance project URLs.
 *
 * Fetch strategy: Use ZAI page_reader to scrape the project page,
 * then extract multiple project images, description, and metadata.
 *
 * URL pattern: behance.net/gallery/<project-id>/<slug>
 */

import type { SourceAdapter, FetchContext, FetchResult } from "./types";
import type { PageContent } from "@/lib/pipeline/types";
import { withTimeout } from "@/lib/pipeline/helpers";
import { downloadImageAsBase64 } from "@/lib/pinterest";

export class BehanceAdapter implements SourceAdapter {
  readonly type = "behance" as const;
  readonly label = "Behance Project";
  readonly canFetchHtml = true;
  readonly canExtractRsc = false;
  readonly hasMultiplePages = true;
  readonly hasSourceCode = false;
  readonly category = "visual" as const;

  async fetch(ctx: FetchContext): Promise<FetchResult> {
    const url = ctx.urls[0];
    if (!url) {
      return { images: [], metadata: { title: "Behance Project" } };
    }

    try {
      // Use ZAI page_reader to fetch the project page
      const r = await withTimeout(
        ctx.zai.functions.invoke("page_reader", { url }),
        15000,
        "behance-page-reader"
      );

      const html = (r as any)?.data?.html || "";
      const title = (r as any)?.data?.title || "";

      // Extract project images (Behance uses JS-driven lazy loading,
      // but we can get some from <img> tags and og:image)
      const imageUrls: string[] = [];

      // og:image for the cover
      const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      if (ogImage?.[1]) imageUrls.push(ogImage[1]);

      // Extract all project images from the page content
      const imgRegex = /<img[^>]+src=["'](https:\/\/mir-s3-cdn-cf\.behance\.net\/[^"']+)["']/gi;
      let match;
      while ((match = imgRegex.exec(html)) !== null) {
        if (!imageUrls.includes(match[1])) {
          imageUrls.push(match[1]);
        }
      }

      // Also look for preview images in data attributes
      const dataImgRegex = /data-src=["'](https:\/\/mir-s3-cdn-cf\.behance\.net\/[^"']+)["']/gi;
      while ((match = dataImgRegex.exec(html)) !== null) {
        if (!imageUrls.includes(match[1])) {
          imageUrls.push(match[1]);
        }
      }

      // Limit to first 10 images
      const limitedUrls = imageUrls.slice(0, 10);

      // Download images (up to 5 for VLM analysis — parallel)
      const images: FetchResult["images"] = [];
      const downloadPromises = limitedUrls.slice(0, 5).map(async (imgUrl) => {
        try {
          const base64 = await withTimeout(downloadImageAsBase64(imgUrl), 10000, "behance-img");
          if (base64) {
            images.push({ base64, url: imgUrl, alt: title });
          }
        } catch (e) {
          console.warn("[behance-adapter] Image download failed:", e);
        }
      });
      await Promise.allSettled(downloadPromises);

      // Extract author
      const authorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<a[^>]*class=["'][^"']*owner-name[^"']*["'][^>]*>([^<]+)/i);
      const author = authorMatch?.[1]?.trim() || "";

      // Extract description
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      const description = descMatch?.[1]?.trim() || "";

      // Extract views count
      const viewsMatch = html.match(/["']views["']\s*:\s*["']?(\d[\d,]*)/i);

      // Build additional pages from project description
      const additionalPages: PageContent[] = [];
      if (html) {
        const cleanContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 5000);

        if (cleanContent.length > 100) {
          additionalPages.push({
            url,
            title: title.replace(" | Behance", "").trim(),
            content: cleanContent,
          });
        }
      }

      return {
        images,
        htmlContent: html,
        metadata: {
          title: title.replace(" | Behance", "").trim() || "Behance Project",
          author,
          description,
          thumbnailUrl: ogImage?.[1],
          originalUrl: url,
          extra: {
            views: viewsMatch?.[1]?.replace(/,/g, "") || undefined,
            imageCount: imageUrls.length,
          },
        },
        additionalPages,
      };
    } catch (e) {
      console.warn("[behance-adapter] Fetch failed:", e);
      return {
        images: [],
        metadata: { title: "Behance Project", originalUrl: url },
      };
    }
  }

  extraSteps() {
    return [];
  }
}
