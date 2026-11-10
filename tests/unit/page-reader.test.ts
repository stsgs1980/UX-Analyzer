import { describe, it, expect, mock } from 'bun:test';
import { readPage, invokeSearch } from '@/lib/page-reader';

function provider(result: unknown, shouldThrow = false) {
  return {
    functions: {
      invoke: mock(async () => {
        if (shouldThrow) throw new Error('provider exploded');
        return result;
      }),
    },
  };
}

describe('readPage', () => {
  it('uses the primary provider when it returns content', async () => {
    const primary = provider({ data: { html: '<html>primary</html>', title: 'Primary' } });
    const fallback = provider({ data: { html: '<html>fallback</html>', title: 'Fallback' } });

    const result = await readPage(primary, fallback, 'https://example.com');

    expect(result.data.html).toBe('<html>primary</html>');
    expect(fallback.functions.invoke).not.toHaveBeenCalled();
  });

  it('falls back to native fetch when the provider answers with an error payload', async () => {
    // ZAI answers with HTTP 200 and an error body - the SDK resolves to undefined.
    const primary = provider(undefined);
    const fallback = provider({ data: { html: '<html>fallback</html>', title: 'Fallback' } });

    const result = await readPage(primary, fallback, 'https://example.com');

    expect(result.data.html).toBe('<html>fallback</html>');
    expect(fallback.functions.invoke).toHaveBeenCalledWith('page_reader', {
      url: 'https://example.com',
    });
  });

  it('falls back to native fetch when the provider throws', async () => {
    const primary = provider(null, true);
    const fallback = provider({ data: { html: '<html>fallback</html>', title: 'Fallback' } });

    const result = await readPage(primary, fallback, 'https://example.com');

    expect(result.data.html).toBe('<html>fallback</html>');
  });

  it('works without a primary provider', async () => {
    const fallback = provider({ data: { html: '<html>fallback</html>', title: 'Fallback' } });

    const result = await readPage(null, fallback, 'https://example.com');

    expect(result.data.title).toBe('Fallback');
  });
});

describe('invokeSearch', () => {
  it('returns primary results when available', async () => {
    const primary = provider([{ url: 'https://a', name: 'A', snippet: 's' }]);
    const fallback = provider([]);

    const items = (await invokeSearch(primary, fallback, 'query', 3)) as unknown[];

    expect(items).toHaveLength(1);
    expect(fallback.functions.invoke).not.toHaveBeenCalled();
  });

  it('falls back when the provider throws', async () => {
    const primary = provider(null, true);
    const fallback = provider([{ url: 'https://b', name: 'B', snippet: 's' }]);

    const items = (await invokeSearch(primary, fallback, 'query', 3)) as unknown[];

    expect(items).toHaveLength(1);
  });
});
