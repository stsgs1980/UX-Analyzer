/**
 * Generate a standalone HTML preview from the reference code data.
 * Asks LLM to produce a single-file HTML that renders the key component(s).
 * Populates: ctx.codePreviewHtml
 */

import type { PipelineContext } from '../types';
import { localProvider } from '@/lib/gemini-provider';
import { llmWithFallback } from '../helpers';

/**
 * Collect code snippets from reference data phases.
 */
function collectCodeSnippets(referenceData: Record<string, unknown>): string[] {
  const codeSnippets: string[] = [];
  if (referenceData.phases && Array.isArray(referenceData.phases)) {
    for (const phase of referenceData.phases as Array<Record<string, unknown>>) {
      if (Array.isArray(phase.steps)) {
        for (const step of phase.steps as Array<Record<string, unknown>>) {
          if (step.code && typeof step.code === 'string' && step.code.length > 20) {
            codeSnippets.push(step.code);
          }
        }
      }
    }
  }
  return codeSnippets;
}

/**
 * Extract CSS variables string from reference data, with fallback.
 */
function extractDesignTokens(referenceData: Record<string, unknown>): string {
  const designTokens = referenceData.designTokens as Record<string, unknown> | undefined;
  return designTokens?.cssVariables
    ? String(designTokens.cssVariables)
    : ':root { --primary: #10b981; --bg: #000; --text: #fff; }';
}

/**
 * Build the prompt for HTML preview generation.
 */
function buildCodePreviewPrompt(
  sourceDescription: string,
  tokensStr: string,
  codeSnippets: string[],
): string {
  return `Ты — senior frontend-разработчик. На основе сгенерированного reference implementation pipeline создай ОДИН самодостаточный HTML файл, который визуально демонстрирует ключевой компонент дизайна.

## Исходные данные
- Источник: ${sourceDescription}
- Design Tokens (CSS Variables):\n${tokensStr}
- Код компонентов из pipeline:\n${codeSnippets.slice(0, 5).join('\n\n---\n\n')}

## Требования к HTML

1. ОДИН самодостаточный HTML файл (всё inline: CSS в <style>, JS в <script>)
2. Используй CSS Variables из design tokens
3. Должен быть визуально похож на анализируемый дизайн
4. Отзывчивый: работает от 320px до 1440px
5. НЕ используй внешние CDN (кроме Google Fonts если нужно)
6. Минимальный, но реалистичный контент (тексты-заполнители)
7. Код должен быть чистым и хорошо прокомментированным
8. НЕ добавляй React/JSX — чистый HTML + CSS + vanilla JS

## Вывод

Верни ТОЛЬКО HTML код (без markdown-обёрток, без \`\`\`html). Начинай с <!DOCTYPE html>.`;
}

/**
 * Sanitize HTML preview text: strip markdown wrappers and block dangerous parent/top access.
 */
function sanitizeHtmlPreview(htmlText: string): string {
  let html = htmlText
    .replace(/^```html?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();
  html = html.replace(/window\.parent/gi, '/* blocked */');
  html = html.replace(/window\.top/gi, '/* blocked */');
  return html;
}

/**
 * Phase 2: Generate a standalone HTML preview from the reference code.
 * Asks LLM to produce a single-file HTML that renders the key component(s).
 * Populates: ctx.codePreviewHtml
 */
export async function generateCodePreview(
  ctx: PipelineContext,
  referenceData: Record<string, unknown>,
  sourceDescription: string,
): Promise<void> {
  ctx.send({
    type: 'progress',
    step: 'code_preview',
    message: 'Генерирую live preview кода...',
    progress: 0.935,
    analysisId: ctx.analysisId,
  });

  const codeSnippets = collectCodeSnippets(referenceData);
  const tokensStr = extractDesignTokens(referenceData);

  // If we have no code snippets, skip preview
  if (codeSnippets.length === 0) {
    console.log('[code-preview] No code snippets found, skipping preview generation');
    return;
  }

  const previewPrompt = buildCodePreviewPrompt(sourceDescription, tokensStr, codeSnippets);

  try {
    const completion = await llmWithFallback(
      localProvider,
      ctx.primaryZai,
      {
        messages: [{ role: 'user', content: previewPrompt }],
        thinking: { type: 'disabled' },
      },
      90000,
      'Code preview generation',
      ctx.aiProviderRef,
    );

    let htmlText = (completion as any)?.choices?.[0]?.message?.content || '';
    htmlText = sanitizeHtmlPreview(htmlText);

    if (!htmlText.startsWith('<!DOCTYPE') && !htmlText.startsWith('<html')) {
      console.warn('[code-preview] Response is not valid HTML, skipping');
      return;
    }

    ctx.codePreviewHtml = htmlText;

    ctx.send({
      type: 'code_preview',
      content: htmlText,
      analysisId: ctx.analysisId,
    });

    console.log('[code-preview] Generated HTML preview, length:', htmlText.length);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.warn('[code-preview] Failed:', errMsg);
    ctx.send({
      type: 'warn',
      message: `Live preview не сгенерирован: ${errMsg}`,
      analysisId: ctx.analysisId,
    });
  }
}
