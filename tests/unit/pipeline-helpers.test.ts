import { describe, it, expect, mock } from 'bun:test';
import { llmWithFallback } from '@/lib/pipeline/helpers';

function provider(result: unknown, shouldThrow = false, errorMessage = 'provider exploded') {
  return {
    chat: {
      completions: {
        create: mock(async () => {
          if (shouldThrow) throw new Error(errorMessage);
          return result;
        }),
      },
    },
  };
}

const params = { messages: [{ role: 'user', content: 'hi' }] };

describe('llmWithFallback', () => {
  it('uses the fallback provider when the primary has no balance', async () => {
    const primary = provider(
      null,
      true,
      'API request failed with status 400: insufficient_balance',
    );
    const groq = provider({ choices: [{ message: { content: 'from groq' } }] });

    const result = await llmWithFallback(
      primary,
      [{ name: 'Groq', provider: groq }],
      params,
      5000,
      'LLM analysis',
      { current: 'zai' },
    );

    expect(result.choices[0].message.content).toBe('from groq');
  });

  it('retries once after a rate limit error', async () => {
    let calls = 0;
    const throttled = {
      chat: {
        completions: {
          create: mock(async () => {
            calls += 1;
            if (calls === 1) {
              throw new Error(
                'generic-openai API error 402: {"error":{"code":"FREE_LIMIT","message":"Free limit reached: 1 reply every 45 seconds per IP. Retry after 1s"}}',
              );
            }
            return { choices: [{ message: { content: 'after retry' } }] };
          }),
        },
      },
    };

    const result = await llmWithFallback(
      null,
      [{ name: 'generic-openai', provider: throttled }],
      params,
      5000,
      'LLM analysis',
      { current: 'zai' },
    );

    expect(result.choices[0].message.content).toBe('after retry');
    expect(calls).toBe(2);
  });

  it('skips a provider that keeps failing permanently', async () => {
    const broken = provider(null, true, 'Groq API error 403: Forbidden');
    const working = provider({ choices: [{ message: { content: 'ok' } }] });

    // First call: the broken provider fails and is counted.
    await llmWithFallback(
      null,
      [
        { name: 'BrokenProvider', provider: broken },
        { name: 'WorkingProvider', provider: working },
      ],
      params,
      5000,
      'LLM analysis',
      { current: 'zai' },
    );

    const brokenCallsBefore = broken.chat.completions.create.mock.calls.length;

    // Second call: the broken provider is skipped instead of called again.
    await llmWithFallback(
      null,
      [
        { name: 'BrokenProvider', provider: broken },
        { name: 'WorkingProvider', provider: working },
      ],
      params,
      5000,
      'LLM analysis',
      { current: 'zai' },
    );

    expect(broken.chat.completions.create.mock.calls.length).toBe(brokenCallsBefore);
  });
});
