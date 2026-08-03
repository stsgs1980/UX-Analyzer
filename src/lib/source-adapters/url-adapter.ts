/**
 * URL Adapter — handles generic web page URLs.
 * Refactored from fetch-source.ts (direct image URL fallback) + fetch-pages.ts.
 *
 * This adapter handles:
 * - Fetching page content via ZAI page_reader
 * - Running web_search for context
 * - Extracting tech fingerprints from HTML
 *
 * Note: The actual page_reader/web_search calls happen in the fetch-pages pipeline step.
 * This adapter primarily handles source detection and provides the URL for subsequent steps.
 */

import type { SourceAdapter, FetchContext, FetchResult } from './types';

export class UrlAdapter implements SourceAdapter {
  readonly type = 'url' as const;
  readonly label = 'Web Page';
  readonly canFetchHtml = true;
  readonly canExtractRsc = true;
  readonly hasMultiplePages = true;
  readonly hasSourceCode = false;
  readonly category = 'hybrid' as const;

  async fetch(ctx: FetchContext): Promise<FetchResult> {
    const url = ctx.urls[0] || '';

    return {
      images: [],
      metadata: {
        title: url,
        originalUrl: url,
      },
    };
  }

  extraSteps() {
    return [];
  }
}
