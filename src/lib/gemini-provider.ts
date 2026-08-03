/**
 * Local AI provider — Groq (fast, free GPU inference).
 * Drop-in replacement for z-ai-web-dev-sdk with compatible interface.
 * Uses native fetch for page_reader, Groq for LLM completions.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/** Read a page via native fetch (replaces zai.functions.invoke("page_reader")). */
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

/** Web search stub (returns empty). */
async function webSearch(
  _query: string,
  _num: number,
): Promise<Array<{ url: string; name: string; snippet: string }>> {
  return [];
}

/** Create chat completions via Groq (OpenAI-compatible API). */
async function createCompletion(params: {
  messages: Array<{ role: string; content: string }>;
  thinking?: { type: string };
}): Promise<{ choices: Array<{ message: { content: string } }> }> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set in .env');

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.3,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60000), // Groq is fast, 60s should be plenty
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return {
    choices: data.choices || [{ message: { content: '' } }],
  };
}

/** Vision stub — Groq doesn't support vision, returns empty. */
async function createVision(
  _params: unknown,
): Promise<{ choices: Array<{ message: { content: string } }> }> {
  return { choices: [{ message: { content: '' } }] };
}

/**
 * ZAI-compatible provider object.
 * Use this as a drop-in replacement for `await ZAI.create()`.
 */
export const localProvider = {
  functions: {
    invoke: async (name: string, params: Record<string, unknown>) => {
      if (name === 'page_reader') return pageReader(params.url as string);
      if (name === 'web_search')
        return webSearch(params.query as string, (params.num as number) || 3);
      throw new Error(`Unknown function: ${name}`);
    },
  },
  chat: {
    completions: {
      create: createCompletion,
      createVision: createVision,
    },
  },
};
