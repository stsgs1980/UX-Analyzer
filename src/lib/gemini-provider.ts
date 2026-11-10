/**
 * Local AI provider - Groq (fast, free GPU inference).
 * Drop-in replacement for z-ai-web-dev-sdk with compatible interface.
 *
 * Built on the generic OpenAI-compatible provider so both share the same
 * request handling and page reader implementation.
 */

import { createOpenAICompatibleProvider } from '@/lib/openai-provider';

export const localProvider = createOpenAICompatibleProvider({
  baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || '',
  model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  name: 'Groq',
});
