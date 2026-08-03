/**
 * CodePen Adapter — handles CodePen URLs.
 *
 * Fetch strategy: Use CodePen oEmbed API to get metadata,
 * then extract the pen's HTML/CSS/JS code for analysis.
 *
 * URL pattern: codepen.io/<user>/pen/<id> or codepen.io/<user>/full/<id>
 */

import type { SourceAdapter, FetchContext, FetchResult } from './types';
import { withTimeout } from '@/lib/pipeline/helpers';

export class CodePenAdapter implements SourceAdapter {
  readonly type = 'codepen' as const;
  readonly label = 'CodePen';
  readonly canFetchHtml = false;
  readonly canExtractRsc = false;
  readonly hasMultiplePages = false;
  readonly hasSourceCode = true;
  readonly category = 'code' as const;

  async fetch(ctx: FetchContext): Promise<FetchResult> {
    const url = ctx.urls[0];
    if (!url) {
      return { images: [], metadata: { title: 'CodePen' } };
    }

    try {
      // Step 1: Get metadata via oEmbed
      const oembedUrl = `https://codepen.io/api/oembed?url=${encodeURIComponent(url)}&format=json`;
      const oembedRes = await withTimeout(
        fetch(oembedUrl, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        }),
        10000,
        'codepen-oembed',
      );

      if (!oembedRes.ok) {
        throw new Error(`oEmbed returned ${oembedRes.status}`);
      }

      const oembedData = (await oembedRes.json()) as Record<string, unknown>;
      const title = (oembedData.title as string) || 'CodePen';
      const author = (oembedData.author_name as string) || '';
      const thumbnailUrl = (oembedData.thumbnail_url as string) || '';

      // Step 2: Get the pen's source code via /view endpoint
      let sourceCode = '';
      let sourceCodeLanguage = 'html';

      try {
        // CodePen provides source in JSON format via /pen/<id>.js endpoint
        // We use the /view endpoint to get the rendered HTML
        const normalizedName = url.replace(/\/(full|details|view)\//, '/pen/');
        const penIdMatch = normalizedName.match(/\/pen\/([^/?]+)/);
        if (penIdMatch) {
          // Try to fetch the pen's compiled source
          const sourceUrl = `https://codepen.io/pen/${penIdMatch[1]}.js`;
          const sourceRes = await withTimeout(
            fetch(sourceUrl, {
              headers: { Accept: 'text/html' },
              signal: AbortSignal.timeout(10000),
            }),
            10000,
            'codepen-source',
          );

          if (sourceRes.ok) {
            const sourceText = await sourceRes.text();
            if (sourceText) {
              // Combine the source with metadata
              sourceCode = `<!-- CodePen: ${title} by ${author} -->\n<!-- URL: ${url} -->\n\n${sourceText.substring(0, 50000)}`;
              sourceCodeLanguage = 'html';
            }
          }
        }
      } catch (e) {
        console.warn('[codepen-adapter] Source fetch failed (non-critical):', e);
      }

      // Step 3: Download screenshot for VLM analysis
      const images: FetchResult['images'] = [];
      if (thumbnailUrl) {
        try {
          const { downloadImageAsBase64 } = await import('@/lib/pinterest');
          const imgBase64 = await withTimeout(
            downloadImageAsBase64(thumbnailUrl),
            15000,
            'codepen-screenshot',
          );
          if (imgBase64) {
            images.push({ base64: imgBase64, url: thumbnailUrl, alt: title });
          }
        } catch (e) {
          console.warn('[codepen-adapter] Screenshot download failed:', e);
        }
      }

      return {
        images,
        sourceCode: sourceCode || undefined,
        sourceCodeLanguage,
        metadata: {
          title,
          author,
          thumbnailUrl,
          originalUrl: url,
          extra: {
            authorUrl: (oembedData.author_url as string) || '',
            version: (oembedData.version as string) || '',
          },
        },
      };
    } catch (e) {
      console.warn('[codepen-adapter] Fetch failed:', e);
      return {
        images: [],
        metadata: { title: 'CodePen', originalUrl: url },
      };
    }
  }

  extraSteps() {
    return [];
  }
}
