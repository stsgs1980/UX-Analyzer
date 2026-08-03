/**
 * Dribbble Adapter — handles Dribbble shot URLs.
 *
 * Fetch strategy: Use ZAI page_reader to scrape the shot page,
 * then extract the high-res image, title, author, and metadata.
 *
 * URL pattern: dribbble.com/shots/<shot-id>
 */

import type { SourceAdapter, FetchContext, FetchResult } from './types';
import { withTimeout } from '@/lib/pipeline/helpers';
import { downloadImageAsBase64 } from '@/lib/pinterest';

export class DribbbleAdapter implements SourceAdapter {
  readonly type = 'dribbble' as const;
  readonly label = 'Dribbble Shot';
  readonly canFetchHtml = true;
  readonly canExtractRsc = false;
  readonly hasMultiplePages = false;
  readonly hasSourceCode = false;
  readonly category = 'visual' as const;

  async fetch(ctx: FetchContext): Promise<FetchResult> {
    const url = ctx.urls[0];
    if (!url) {
      return { images: [], metadata: { title: 'Dribbble Shot' } };
    }

    try {
      // Use ZAI page_reader to fetch the shot page
      const r = await withTimeout(
        ctx.zai.functions.invoke('page_reader', { url }),
        15000,
        'dribbble-page-reader',
      );

      const html = (r as any)?.data?.html || '';
      const title = (r as any)?.data?.title || '';

      // Extract image URL from Dribbble page
      // Dribbble uses <meta property="og:image"> for the shot image
      const ogImageMatch =
        html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

      // Fallback: look for the main shot image in the page
      const imgMatch = !ogImageMatch
        ? html.match(/<img[^>]+class=["'][^"']*shot-image[^"']*["'][^>]*src=["']([^"']+)["']/i) ||
          html.match(/<picture[^>]*>.*?<source[^>]*srcset=["']([^"'\s,]+)/i)
        : null;

      const imageUrl = ogImageMatch?.[1] || imgMatch?.[1] || '';

      // Extract author
      const authorMatch =
        html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<span[^>]*class=["'][^"']*display-name[^"']*["'][^>]*>([^<]+)/i);
      const author = authorMatch?.[1]?.trim() || '';

      // Extract description
      const descMatch =
        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      const description = descMatch?.[1]?.trim() || '';

      // Extract likes/views if available
      const likesMatch = html.match(
        /<span[^>]*class=["'][^"']*likes-count[^"']*["'][^>]*>(\d[\d,]*)/i,
      );
      const viewsMatch = html.match(
        /<span[^>]*class=["'][^"']*views-count[^"']*["'][^>]*>(\d[\d,]*)/i,
      );

      const images: FetchResult['images'] = [];

      // Download the shot image
      if (imageUrl) {
        try {
          const imgBase64 = await withTimeout(
            downloadImageAsBase64(imageUrl),
            15000,
            'dribbble-image-download',
          );
          if (imgBase64) {
            images.push({ base64: imgBase64, url: imageUrl, alt: title });
          }
        } catch (e) {
          console.warn('[dribbble-adapter] Image download failed:', e);
        }
      }

      return {
        images,
        htmlContent: html,
        metadata: {
          title: title.replace(' on Dribbble', '').trim() || 'Dribbble Shot',
          author,
          description,
          thumbnailUrl: imageUrl,
          originalUrl: url,
          extra: {
            likes: likesMatch?.[1]?.replace(/,/g, '') || undefined,
            views: viewsMatch?.[1]?.replace(/,/g, '') || undefined,
          },
        },
      };
    } catch (e) {
      console.warn('[dribbble-adapter] Fetch failed:', e);
      return {
        images: [],
        metadata: { title: 'Dribbble Shot', originalUrl: url },
      };
    }
  }

  extraSteps() {
    return [];
  }
}
