/**
 * Step: Fetch page content via page_reader AND web_search in parallel.
 * Also extracts tech fingerprints from raw HTML.
 * Populates: pageContents, searchResults, techFingerprintsText, dataSources
 */

import type { PipelineStep, PageContent, SearchResult } from '../types';
import { withTimeout } from '../helpers';
import { extractTechFingerprints, formatFingerprintsForPrompt } from '@/lib/tech-fingerprints';

export const fetchPagesStep: PipelineStep = {
  id: 'fetch-pages',
  label: 'Чтение страниц',

  async run(ctx) {
    if (!ctx.hasUrls || ctx.hasImageUpload) {
      ctx.send({
        type: 'progress',
        step: 'fetching',
        message: 'Изображение готово к анализу',
        progress: 0.2,
        analysisId: ctx.analysisId,
      });
      return;
    }

    const urlCount = ctx.urls.length;
    const fetchMsg =
      urlCount === 1
        ? 'Читаю страницу и ищу контекст...'
        : 'Читаю ' + urlCount + ' страницы и ищу контекст...';
    ctx.send({
      type: 'progress',
      step: 'fetching',
      message: fetchMsg,
      progress: 0.14,
      analysisId: ctx.analysisId,
    });

    const [fetchOutcome, searchOutcome] = await Promise.allSettled([
      // --- page_reader for all URLs ---
      (async () => {
        const results = await Promise.allSettled(
          ctx.urls.map(async (url) => {
            try {
              const r = await withTimeout(
                ctx.zai.functions.invoke('page_reader', { url }),
                15000,
                `page_reader(${url})`,
              );
              const rawHtml = (r as any).data?.html || '';

              // Extract tech fingerprints from first successful page
              if (!ctx.techFingerprintsText && rawHtml) {
                const fp = extractTechFingerprints(rawHtml);
                ctx.techFingerprintsText = formatFingerprintsForPrompt(fp);
                console.log('[tech-fp] Extracted from', url);
              }

              return {
                url,
                title: (r as any).data?.title || 'Без заголовка',
                rawHtml,
                content: rawHtml
                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                  .replace(/<[^>]*>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim(),
              } as PageContent;
            } catch (err) {
              return {
                url,
                title: 'Недоступно',
                content: '',
                error: err instanceof Error ? err.message : 'timeout',
              } as PageContent;
            }
          }),
        );
        return results
          .filter((r): r is PromiseFulfilledResult<PageContent> => r.status === 'fulfilled')
          .map((r) => r.value);
      })(),
      // --- web_search for first 2 URLs ---
      (async () => {
        const results = await Promise.allSettled(
          ctx.urls.slice(0, 2).map(async (url) => {
            const hostname = new URL(url).hostname;
            const query = `${hostname} design UI UX review`;
            const items = await withTimeout(
              ctx.zai.functions.invoke('web_search', { query, num: 3 }),
              10000,
              `web_search(${hostname})`,
            );
            return ((items || []) as Array<{ url: string; name: string; snippet: string }>)
              .slice(0, 2)
              .map((r) => ({ url: r.url, title: r.name, snippet: r.snippet }));
          }),
        );
        return results
          .filter((r): r is PromiseFulfilledResult<SearchResult[]> => r.status === 'fulfilled')
          .flatMap((r) => r.value);
      })(),
    ]);

    if (fetchOutcome.status === 'fulfilled') ctx.pageContents.push(...fetchOutcome.value);
    if (ctx.pageContents.some((p) => !p.error)) ctx.dataSources.push('page_reader');
    if (searchOutcome.status === 'fulfilled' && searchOutcome.value.length > 0) {
      ctx.searchResults.push(...searchOutcome.value);
      ctx.dataSources.push('web_search');
    }

    const okPages = ctx.pageContents.filter((p) => !p.error).length;
    ctx.send({
      type: 'progress',
      step: 'fetching',
      message: `Получено ${okPages} ${okPages === 1 ? 'страница' : 'страниц'}, ${ctx.searchResults.length} результатов поиска`,
      progress: 0.32,
      analysisId: ctx.analysisId,
    });
  },
};
