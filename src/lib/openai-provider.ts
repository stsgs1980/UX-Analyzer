/**
 * Generic OpenAI-compatible provider.
 *
 * Works with any endpoint that implements the OpenAI chat/completions API:
 * Groq, OpenRouter, OpenCode Zen, DeepSeek, Mistral, SiliconFlow, Pollinations.
 *
 * The API key is optional - some providers allow anonymous access.
 *
 * Also provides a native-fetch page reader, used as a fallback when the
 * upstream AI provider cannot read pages (e.g. no balance or no permissions).
 */

export interface ChatCompletionResult {
  choices: Array<{ message: { content: string } }>;
}

export interface OpenAIProviderOptions {
  /** Base URL including /v1 (e.g. https://api.groq.com/openai/v1) */
  baseUrl: string;
  /** Optional. Sent as `Authorization: Bearer <key>` when present. */
  apiKey?: string;
  /** Model id passed in the request body. */
  model: string;
  /** Human readable name used in logs and in the result metadata. */
  name?: string;
  timeoutMs?: number;
  maxTokens?: number;
  temperature?: number;
  /** Reasoning effort for reasoning models: 'low' | 'medium' | 'high'. */
  reasoningEffort?: string;
}

export interface OpenAIProvider {
  name: string;
  /** True when the provider has enough config to be used. */
  isConfigured(): boolean;
  functions: {
    invoke(name: string, params: Record<string, unknown>): Promise<unknown>;
  };
  chat: {
    completions: {
      create(params: {
        messages: Array<{ role: string; content: string }>;
        thinking?: { type: string };
      }): Promise<ChatCompletionResult>;
      createVision(params: unknown): Promise<ChatCompletionResult>;
    };
  };
}

/** Read a page via native fetch (no AI provider involved). */
async function pageReader(url: string): Promise<{ data: { html: string; title: string } }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UXAnalyzer/1.0)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Без заголовка';
  return { data: { html, title } };
}

/** Web search is not available on generic OpenAI-compatible endpoints. */
async function webSearch(
  _query: string,
  _num: number,
): Promise<Array<{ url: string; name: string; snippet: string }>> {
  return [];
}

export function createOpenAICompatibleProvider(options: OpenAIProviderOptions): OpenAIProvider {
  const {
    baseUrl,
    apiKey = '',
    model,
    name = 'openai-compatible',
    timeoutMs = 120000,
    maxTokens = 4096,
    temperature = 0.3,
    reasoningEffort = '',
  } = options;

  const normalizedBase = baseUrl.replace(/\/+$/, '');

  function headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) h.Authorization = `Bearer ${apiKey}`;
    return h;
  }

  function requestBody(
    messages: Array<{ role: string; content: string }>,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...extra,
    };
    // Reasoning models burn the token budget on thinking - without this the
    // answer gets truncated before the JSON is finished.
    if (reasoningEffort) body.reasoning_effort = reasoningEffort;
    return body;
  }

  async function createCompletion(params: {
    messages: Array<{ role: string; content: string }>;
    thinking?: { type: string };
  }): Promise<ChatCompletionResult> {
    if (!normalizedBase) throw new Error(`${name}: base URL not configured`);
    if (!model) throw new Error(`${name}: model not configured`);

    const res = await fetch(`${normalizedBase}/chat/completions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(
        requestBody(params.messages.map((m) => ({ role: m.role, content: m.content }))),
      ),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`${name} API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return { choices: data.choices || [{ message: { content: '' } }] };
  }

  /** Vision is optional - endpoints that do not support it will fail the call. */
  async function createVision(params: unknown): Promise<ChatCompletionResult> {
    if (!normalizedBase) throw new Error(`${name}: base URL not configured`);
    if (!model) throw new Error(`${name}: model not configured`);

    const body = params as { messages: Array<{ role: string; content: unknown }> };
    const res = await fetch(`${normalizedBase}/chat/completions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(requestBody(body.messages as Array<{ role: string; content: string }>)),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`${name} vision API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return { choices: data.choices || [{ message: { content: '' } }] };
  }

  return {
    name,
    isConfigured: () => Boolean(normalizedBase && model),
    functions: {
      invoke: async (fnName: string, params: Record<string, unknown>) => {
        if (fnName === 'page_reader') return pageReader(params.url as string);
        if (fnName === 'web_search')
          return webSearch(params.query as string, (params.num as number) || 3);
        throw new Error(`Unknown function: ${fnName}`);
      },
    },
    chat: { completions: { create: createCompletion, createVision } },
  };
}

/**
 * Provider configured through env vars, used as the last fallback in the chain.
 *
 * AI_BASE_URL - OpenAI-compatible base URL (e.g. https://text.pollinations.ai/openai)
 * AI_API_KEY  - optional, anonymous access works on some providers
 * AI_MODEL    - model id
 */
export const genericProvider = createOpenAICompatibleProvider({
  baseUrl: process.env.AI_BASE_URL || '',
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || '',
  name: 'generic-openai',
  // Reasoning models spend part of the budget on thinking - a low limit
  // truncates the JSON answer mid-document.
  maxTokens: Number(process.env.AI_MAX_TOKENS || 8192),
  reasoningEffort: process.env.AI_REASONING_EFFORT || 'low',
});
