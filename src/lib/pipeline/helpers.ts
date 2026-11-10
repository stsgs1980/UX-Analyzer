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
 * Provider health tracking.
 *
 * A provider that fails with an auth/balance error stays broken for a while -
 * calling it on every analysis only wastes time and pollutes the log.
 */
interface ProviderHealth {
  failures: number;
  disabledUntil: number;
}

const providerHealth = new Map<string, ProviderHealth>();
const DISABLE_AFTER_FAILURES = 1;
const DISABLE_MS = 5 * 60_000;

/** Errors that mean "this provider will keep failing until the config changes". */
function isPermanentFailure(msg: string): boolean {
  return (
    msg.includes('insufficient_balance') ||
    msg.includes('Forbidden') ||
    msg.includes('model_access_denied') ||
    msg.includes('Invalid API Key') ||
    msg.includes('does not support image input') ||
    msg.includes('401') ||
    msg.includes('403')
  );
}

/** True when the provider is temporarily disabled after repeated failures. */
export function isProviderDisabled(name: string): boolean {
  return isDisabled(name);
}

/** Rate-limit errors: the provider is alive, it just needs a pause. */
function isRateLimit(msg: string): boolean {
  return msg.includes('FREE_LIMIT') || msg.includes('rate limit') || msg.includes('status 429');
}

/** Seconds to wait before retrying, as reported by the provider. */
function parseRetryAfter(msg: string): number {
  const match = msg.match(/Retry after (\d+)s/i);
  if (match) return Number(match[1]);
  const retryAfter = msg.match(/retry_after["':\s]+(\d+)/i);
  if (retryAfter) return Number(retryAfter[1]);
  return 30;
}

function isDisabled(name: string): boolean {
  const health = providerHealth.get(name);
  return !!health && health.disabledUntil > Date.now();
}

function recordFailure(name: string, msg: string): void {
  const health = providerHealth.get(name) || { failures: 0, disabledUntil: 0 };
  health.failures += 1;
  // Permanent errors (no balance, forbidden) will not fix themselves within the
  // cooldown - disable the provider right away.
  if (isPermanentFailure(msg) && health.failures >= DISABLE_AFTER_FAILURES) {
    health.disabledUntil = Date.now() + DISABLE_MS;
    console.warn(
      `[llm] provider "${name}" disabled for ${DISABLE_MS / 60000} min (${msg.substring(0, 80)})`,
    );
  }
  providerHealth.set(name, health);
}

function recordSuccess(name: string): void {
  providerHealth.delete(name);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Try LLM call with primary provider, then fall back through the provider chain.
 * Handles: insufficient_balance, API errors, timeouts, provider rate limits.
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
  if (primaryZai && !isDisabled('ZAI')) {
    try {
      const result = await withTimeout(
        primaryZai.chat.completions.create(params),
        timeoutMs,
        label,
      );
      recordSuccess('ZAI');
      return result as { choices: Array<{ message: { content: string } }> };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('insufficient_balance') || msg.includes('API request failed')) {
        console.warn(
          `[llm] ${label}: ZAI failed (${msg.substring(0, 100)}), trying fallback providers...`,
        );
        aiProviderRef.current = 'zai-failed';
        recordFailure('ZAI', msg);
      } else {
        throw e; // Non-ZAI error, propagate
      }
    }
  } else if (primaryZai) {
    console.warn(`[llm] ${label}: skipping ZAI (temporarily disabled)`);
  }

  // Fallback chain: Groq -> configured OpenAI-compatible endpoint
  let lastError: unknown;
  for (const fallback of fallbacks) {
    if (isDisabled(fallback.name)) {
      console.warn(`[llm] ${label}: skipping ${fallback.name} (temporarily disabled)`);
      continue;
    }
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await withTimeout(
          fallback.provider.chat.completions.create(params),
          timeoutMs,
          `${label} (${fallback.name})`,
        );
        recordSuccess(fallback.name);
        aiProviderRef.current = fallback.name;
        return result as { choices: Array<{ message: { content: string } }> };
      } catch (e) {
        lastError = e;
        const msg = e instanceof Error ? e.message : String(e);
        if (attempt === 1 && isRateLimit(msg)) {
          // The provider is alive but throttled - wait and try once more.
          const waitSec = Math.min(parseRetryAfter(msg), 90);
          console.warn(`[llm] ${label}: ${fallback.name} rate limited, retry in ${waitSec}s...`);
          await sleep(waitSec * 1000);
          continue;
        }
        console.warn(`[llm] ${label}: ${fallback.name} failed (${msg.substring(0, 120)})`);
        recordFailure(fallback.name, msg);
        break;
      }
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
