/**
 * Step: Main LLM analysis — build prompt, call LLM, parse JSON result.
 * Populates: analysisResult
 */

import type { PipelineStep } from '../types';
import { buildAnalysisPrompt } from '@/lib/analysis-prompt';
import { localProvider } from '@/lib/gemini-provider';
import { extractJson } from '@/lib/extract-json';
import { withTimeout, llmWithFallback } from '../helpers';

export const llmAnalysisStep: PipelineStep = {
  id: 'llm-analysis',
  label: 'AI-анализ',

  async run(ctx) {
    ctx.send({
      type: 'progress',
      step: 'preparing',
      message: 'Компоную данные для AI-анализа...',
      progress: 0.52,
      analysisId: ctx.analysisId,
    });

    const prompt = buildAnalysisPrompt(
      ctx.urls,
      ctx.pageContents,
      ctx.searchResults,
      ctx.vlmResult,
      ctx.sourceType,
      ctx.imageFileName || undefined,
      ctx.techFingerprintsText,
    );

    // Heartbeat: send progress updates while LLM is thinking (0.52 → 0.80)
    const methods = [
      'Анализ визуального стиля',
      'Оценка архитектуры',
      'Майнинг UX-паттернов',
      'Реверс-инжиниринг стека',
      'Эвристическая оценка',
      'Создание спецификаций',
      'Генерация пользовательских историй',
      'Итоговый аудит',
    ];
    let heartbeatIdx = 0;
    const heartbeatInterval = setInterval(() => {
      if (heartbeatIdx < methods.length) {
        const p = 0.52 + (0.8 - 0.52) * ((heartbeatIdx + 1) / methods.length);
        ctx.send({
          type: 'progress',
          step: 'analyzing',
          message: `AI обрабатывает: ${methods[heartbeatIdx]}...`,
          progress: Math.round(p * 100) / 100,
          analysisId: ctx.analysisId,
        });
        heartbeatIdx++;
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 5000);

    try {
      const completion = await llmWithFallback(
        localProvider,
        ctx.primaryZai,
        {
          messages: [{ role: 'user', content: prompt }],
          thinking: { type: 'disabled' },
        },
        120000,
        'LLM analysis',
        ctx.aiProviderRef,
      );

      clearInterval(heartbeatInterval);

      let responseText = (completion as any)?.choices?.[0]?.message?.content || '';

      // Parse JSON
      ctx.send({
        type: 'progress',
        step: 'parsing',
        message: 'Разбираю структуру результатов...',
        progress: 0.82,
        analysisId: ctx.analysisId,
      });

      const jsonStr = extractJson(responseText);

      let analysisResult: Record<string, unknown>;
      try {
        analysisResult = JSON.parse(jsonStr);
      } catch {
        analysisResult = {
          type: ctx.hasImageUpload ? 'upload' : ctx.urls.length === 1 ? 'single' : 'batch',
          url: ctx.urls?.[0],
          parseError: 'Не удалось разобрать JSON-ответ от LLM',
          rawResponse: responseText.substring(0, 2000),
        };
      }

      // Merge VLM results
      if (ctx.vlmResult) {
        analysisResult.vlmAnalysis = ctx.vlmResult;
      }

      // Add source metadata
      analysisResult.sourceType = ctx.adapter.type;
      analysisResult.meta = {
        dataSources: ctx.dataSources,
        aiProvider: ctx.aiProviderRef.current,
        confidence:
          ctx.vlmResult && ctx.pageContents.length > 0
            ? 'high'
            : ctx.pageContents.length > 0 || ctx.vlmResult
              ? 'medium'
              : 'low',
        missingData: [] as string[],
      };
      if (ctx.extractedImageUrl) analysisResult.imagePreviewUrl = ctx.extractedImageUrl;
      if (ctx.pinterestData) analysisResult.pinterestData = ctx.pinterestData;
      if (ctx.metadata) analysisResult.sourceMetadata = ctx.metadata;

      ctx.analysisResult = analysisResult;
    } finally {
      clearInterval(heartbeatInterval);
    }
  },
};
