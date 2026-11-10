import { describe, it, expect, mock } from 'bun:test';
import { createOpenAICompatibleProvider } from '@/lib/openai-provider';

function stubFetch(handler: (...args: any[]) => Promise<Response>) {
  const original = globalThis.fetch;
  const fn = mock(handler as any);
  (globalThis as any).fetch = fn;
  return {
    fn,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createOpenAICompatibleProvider', () => {
  it('is not configured without base URL or model', () => {
    expect(createOpenAICompatibleProvider({ baseUrl: '', model: 'm' }).isConfigured()).toBe(false);
    expect(
      createOpenAICompatibleProvider({ baseUrl: 'https://x/v1', model: '' }).isConfigured(),
    ).toBe(false);
    expect(
      createOpenAICompatibleProvider({ baseUrl: 'https://x/v1', model: 'm' }).isConfigured(),
    ).toBe(true);
  });

  it('posts to <base>/chat/completions with the configured model', async () => {
    const stub = stubFetch(async () =>
      jsonResponse({ choices: [{ message: { content: 'hello' } }] }),
    );

    const provider = createOpenAICompatibleProvider({
      baseUrl: 'https://example.com/v1/',
      apiKey: 'secret-key',
      model: 'my-model',
      name: 'TestProvider',
    });

    const result = await provider.chat.completions.create({
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result.choices[0].message.content).toBe('hello');
    expect(stub.fn).toHaveBeenCalledTimes(1);

    const [url, init] = stub.fn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.com/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret-key');

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('my-model');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);

    stub.restore();
  });

  it('omits the Authorization header when no key is configured', async () => {
    const stub = stubFetch(async () => jsonResponse({ choices: [{ message: { content: 'ok' } }] }));

    const provider = createOpenAICompatibleProvider({
      baseUrl: 'https://example.com/v1',
      model: 'my-model',
    });

    await provider.chat.completions.create({ messages: [{ role: 'user', content: 'hi' }] });

    const [, init] = stub.fn.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();

    stub.restore();
  });

  it('throws with the status code when the endpoint fails', async () => {
    const stub = stubFetch(async () => new Response('upstream exploded', { status: 503 }));

    const provider = createOpenAICompatibleProvider({
      baseUrl: 'https://example.com/v1',
      model: 'my-model',
      name: 'TestProvider',
    });

    await expect(
      provider.chat.completions.create({ messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow(/TestProvider API error 503/);

    stub.restore();
  });

  it('reads pages through native fetch', async () => {
    const stub = stubFetch(
      async () =>
        new Response('<html><head><title>Hello page</title></head><body>content</body></html>', {
          status: 200,
        }),
    );

    const provider = createOpenAICompatibleProvider({
      baseUrl: 'https://example.com/v1',
      model: 'my-model',
    });

    const result = (await provider.functions.invoke('page_reader', {
      url: 'https://target.example',
    })) as { data: { html: string; title: string } };

    expect(result.data.title).toBe('Hello page');
    expect(result.data.html).toContain('content');

    stub.restore();
  });
});
