/**
 * Step: VLM visual analysis — analyze image with vision model.
 * Populates: vlmResult, dataSources
 */

import type { PipelineStep } from '../types';
import type { VlmAnalysisResult } from '@/lib/vlm-prompt';
import { VLM_ANALYSIS_PROMPT } from '@/lib/vlm-prompt';
import { withTimeout, isProviderDisabled } from '../helpers';
import { extractJson } from '@/lib/extract-json';

export const vlmAnalysisStep: PipelineStep = {
  id: 'vlm-analysis',
  label: 'Визуальный анализ',

  async run(ctx) {
    // Vision providers: primary (ZAI) -> configured OpenAI-compatible endpoint.
    const visionProviders: Array<{ name: string; provider: any }> = [
      ...(ctx.primaryZai ? [{ name: 'ZAI', provider: ctx.primaryZai }] : []),
      ...(ctx.providerChain || []).filter((p) => p.provider?.chat?.completions?.createVision),
    ].filter((p) => !isProviderDisabled(p.name));

    if (!ctx.extractedImageBase64 || visionProviders.length === 0) {
      ctx.dataSources.push('url_only');
      return;
    }

    ctx.send({
      type: 'progress',
      step: 'vlm',
      message: 'Распознаю визуальный дизайн: цвета, типографику, компоновку...',
      progress: 0.38,
      analysisId: ctx.analysisId,
    });

    for (const vision of visionProviders) {
      try {
        console.log(
          `[vlm] Starting VLM analysis via ${vision.name}, image size:`,
          Math.round((ctx.extractedImageBase64!.length * 3) / 4 / 1024),
          'KB',
        );
        const vlmResponse = await withTimeout(
          vision.provider.chat.completions.createVision({
            model: 'default',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: ctx.extractedImageBase64 } },
                  { type: 'text', text: VLM_ANALYSIS_PROMPT },
                ],
              },
            ],
            thinking: { type: 'disabled' },
          }),
          30000,
          'VLM analysis',
        );

        const vlmText = (vlmResponse as any)?.choices?.[0]?.message?.content || '';
        console.log(
          '[vlm] Response length:',
          vlmText.length,
          vlmText ? '(has content)' : '(EMPTY!)',
        );
        if (!vlmText) {
          throw new Error(`${vision.name} returned an empty response`);
        }
        const jsonStr = extractJson(vlmText);
        try {
          ctx.vlmResult = JSON.parse(jsonStr) as VlmAnalysisResult;
          ctx.dataSources.push('vlm');
          console.log('[vlm] Parsed OK, keys:', Object.keys(ctx.vlmResult));
          ctx.send({
            type: 'progress',
            step: 'vlm',
            message: 'Визуальный анализ завершён',
            progress: 0.48,
            analysisId: ctx.analysisId,
          });
        } catch (parseErr) {
          console.warn('[vlm] Failed to parse VLM response:', parseErr);
          console.warn('[vlm] Raw JSON that failed:', jsonStr.substring(0, 500));
        }
        break;
      } catch (e) {
        console.warn(`[vlm] ${vision.name} failed:`, e instanceof Error ? e.message : e);
      }
    }
  },
};
