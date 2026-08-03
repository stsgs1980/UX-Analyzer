/**
 * Pipeline step: Generate Reference Implementation Pipeline.
 * Uses analysis results + VLM data to create code-level implementation guide.
 * After generating code, also produces a standalone HTML preview.
 * Populates: referenceCode (string markdown), codePreviewHtml (string), adds to analysisResult.referenceCode
 *
 * This step is OPTIONAL — controlled by ctx.generateReferenceCode flag.
 */

import type { PipelineStep } from '../types';
import { buildReferenceCodePrompt } from '@/lib/reference-code-prompt';
import { localProvider } from '@/lib/gemini-provider';
import { llmWithFallback } from '../helpers';
import { extractJson } from '@/lib/extract-json';
import { formatReferenceCode } from './format-reference-code';
import { generateCodePreview } from './generate-code-preview';

// Re-export for backward compatibility (tests import from here)
export { formatReferenceCode } from './format-reference-code';

export const referenceCodeStep: PipelineStep = {
  id: 'reference-code',
  label: 'Reference Pipeline',

  async run(ctx) {
    // Skip if not requested or no analysis result
    if (!ctx.generateReferenceCode) {
      return;
    }

    if (!ctx.analysisResult) {
      console.log('[reference-code] Skipped: no analysis result');
      return;
    }

    ctx.send({
      type: 'progress',
      step: 'reference_code',
      message: 'Генерирую reference implementation pipeline...',
      progress: 0.91,
      analysisId: ctx.analysisId,
    });

    const sourceDescription = ctx.pinterestData
      ? 'Pinterest: ' + ctx.pinterestData.title + ' by ' + ctx.pinterestData.authorName
      : ctx.hasImageUpload
        ? 'Uploaded: ' + (ctx.imageFileName || 'image')
        : ctx.urls[0] || 'unknown';

    const prompt = buildReferenceCodePrompt(
      ctx.analysisResult,
      ctx.vlmResult,
      ctx.designMdContent,
      sourceDescription,
    );

    try {
      const completion = await llmWithFallback(
        localProvider,
        ctx.primaryZai,
        {
          messages: [{ role: 'user', content: prompt }],
          thinking: { type: 'disabled' },
        },
        120000,
        'Reference code generation',
        ctx.aiProviderRef,
      );

      const responseText = (completion as any)?.choices?.[0]?.message?.content || '';

      if (!responseText) {
        console.warn('[reference-code] Empty response from LLM');
        return;
      }

      // Try to parse as JSON, fallback to raw markdown
      const jsonStr = extractJson(responseText);
      let referenceData: Record<string, unknown>;

      try {
        referenceData = JSON.parse(jsonStr);
      } catch {
        // If JSON parse fails, wrap raw text
        referenceData = { raw: responseText, parseError: true };
      }

      // Convert to displayable markdown
      const referenceCode = formatReferenceCode(referenceData, sourceDescription);
      ctx.referenceCode = referenceCode;

      // Add to analysis result
      if (ctx.analysisResult) {
        (ctx.analysisResult as Record<string, unknown>).referenceCode = referenceData;
      }

      ctx.send({
        type: 'reference_code',
        content: referenceCode,
        analysisId: ctx.analysisId,
      });

      console.log('[reference-code] Generated successfully, length:', referenceCode.length);

      // ── Phase 2: Generate live code preview HTML ──
      await generateCodePreview(ctx, referenceData, sourceDescription);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.warn('[reference-code] Failed:', errMsg);
      ctx.send({
        type: 'warn',
        message: `Reference pipeline не сгенерирован: ${errMsg}`,
        analysisId: ctx.analysisId,
      });
    }
  },
};
