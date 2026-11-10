/**
 * Page reading and web search helpers.
 *
 * The primary AI provider is used first. When it cannot read pages (no
 * balance, no permissions, or it answers with an error payload) the native
 * fetch reader is used instead, so the pipeline always gets page content.
 */

export interface PageReadResult {
  data: { html: string; title: string };
}

export interface ProviderLike {
  functions: {
    invoke(name: string, params: Record<string, unknown>): Promise<unknown>;
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Read a page through the primary provider, falling back to a native fetch
 * reader when the provider cannot read pages.
 */
export async function readPage(
  primaryZai: ProviderLike | null,
  fallbackProvider: ProviderLike,
  url: string,
  timeoutMs = 15000,
): Promise<PageReadResult> {
  if (primaryZai) {
    try {
      const res = (await withTimeout(
        primaryZai.functions.invoke('page_reader', { url }),
        timeoutMs,
        `page_reader(${url})`,
      )) as PageReadResult | undefined;
      // Some providers answer with HTTP 200 and an error payload - the SDK then
      // resolves to undefined, so the content has to be validated explicitly.
      if (res?.data?.html) {
        return res;
      }
      console.warn(`[page_reader] provider returned no content for ${url}, using native fetch...`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(
        `[page_reader] provider failed (${msg.substring(0, 100)}), using native fetch...`,
      );
    }
  }
  return withTimeout(
    fallbackProvider.functions.invoke('page_reader', { url }) as Promise<PageReadResult>,
    timeoutMs,
    `page_reader_native(${url})`,
  );
}

/**
 * Web search through the primary provider, falling back to the native provider
 * (which returns an empty list - generic endpoints have no search function).
 */
export async function invokeSearch(
  primaryZai: ProviderLike | null,
  fallbackProvider: ProviderLike,
  query: string,
  num: number,
  timeoutMs = 10000,
): Promise<unknown> {
  if (primaryZai) {
    try {
      return await withTimeout(
        primaryZai.functions.invoke('web_search', { query, num }),
        timeoutMs,
        `web_search(${query})`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[web_search] provider failed (${msg.substring(0, 100)}), using fallback...`);
    }
  }
  return withTimeout(
    fallbackProvider.functions.invoke('web_search', { query, num }),
    timeoutMs,
    `web_search_native(${query})`,
  );
}
