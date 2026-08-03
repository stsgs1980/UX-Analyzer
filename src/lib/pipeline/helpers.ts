/**
 * Shared helper utilities for pipeline steps.
 * Extracted from the monolithic route.ts.
 */

/** Timeout wrapper — race a promise against a timer */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Try LLM call with primary provider, fallback to localProvider on ZAI errors.
 * Handles: insufficient_balance, API errors, timeouts.
 */
export async function llmWithFallback(
  zai: any,
  primaryZai: any,
  params: { messages: Array<{ role: string; content: string }>; thinking?: { type: string } },
  timeoutMs: number,
  label: string,
  aiProviderRef: { current: string },
): Promise<{ choices: Array<{ message: { content: string } }> }> {
  // Try primary (ZAI) first
  if (primaryZai) {
    try {
      const result = await withTimeout(primaryZai.chat.completions.create(params), timeoutMs, label);
      return result as { choices: Array<{ message: { content: string } }> };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("insufficient_balance") || msg.includes("API request failed")) {
        console.warn(`[llm] ${label}: ZAI failed (${msg.substring(0, 100)}), falling back to Groq...`);
        aiProviderRef.current = "groq";
      } else {
        throw e; // Non-ZAI error, propagate
      }
    }
  }
  // Fallback to localProvider (Groq)
  return withTimeout(zai.chat.completions.create(params), timeoutMs, `${label} (Groq)`);
}

/** Safely run a DB operation, returning null on failure. */
export async function dbSafe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.warn("[db] Operation skipped:", e);
    return null;
  }
}
