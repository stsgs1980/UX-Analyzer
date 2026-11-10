/**
 * Shared helper utilities for pipeline steps.
 * Extracted from the monolithic route.ts.
 */

/** Timeout wrapper — race a promise against a timer */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Try LLM call with primary provider, then fall back through the provider chain.
 * Handles: insufficient_balance, API errors, timeouts.
 */
export async function llmWithFallback(
  primaryZai: any,
  fallbacks: Array<{ name: string; provider: any }>,
  params: { messages: Array<{ role: string; content: string }>; thinking?: { type: string } },
  timeoutMs: number,
  label: string,
  aiProviderRef: { current: string },
): Promise<{ choices: Array<{ message: { content: string } }> }> {
  // Try primary (ZAI) first
  if (primaryZai) {
    try {
      const result = await withTimeout(
        primaryZai.chat.completions.create(params),
        timeoutMs,
        label,
      );
      return result as { choices: Array<{ message: { content: string } }> };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('insufficient_balance') || msg.includes('API request failed')) {
        console.warn(
          `[llm] ${label}: ZAI failed (${msg.substring(0, 100)}), trying fallback providers...`,
        );
        aiProviderRef.current = 'zai-failed';
      } else {
        throw e; // Non-ZAI error, propagate
      }
    }
  }
  // Fallback chain: Groq -> configured OpenAI-compatible endpoint
  let lastError: unknown;
  for (const fallback of fallbacks) {
    try {
      const result = await withTimeout(
        fallback.provider.chat.completions.create(params),
        timeoutMs,
        `${label} (${fallback.name})`,
      );
      aiProviderRef.current = fallback.name;
      return result as { choices: Array<{ message: { content: string } }> };
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[llm] ${label}: ${fallback.name} failed (${msg.substring(0, 120)})`);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label}: no provider available`);
}

/** Safely run a DB operation, returning null on failure. */
export async function dbSafe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.warn('[db] Operation skipped:', e);
    return null;
  }
}
