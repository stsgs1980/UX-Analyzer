import ZAI from 'z-ai-web-dev-sdk';
import { localProvider } from '@/lib/gemini-provider';
import { db } from '@/lib/db';
import { validateExternalUrl } from '@/lib/url-safety';
import { dbSafe } from '@/lib/pipeline/helpers';
import { runPipeline } from '@/lib/pipeline/runner';
import type { PipelineContext } from '@/lib/pipeline/types';
import { updateProgress, completeProgress, errorProgress } from '@/lib/progress-store';
import { createAdapter } from '@/lib/source-adapters';
import { buildPipeline } from '@/lib/pipeline/pipeline-builder';

export interface RunAnalysisPipelineOptions {
  urls: string[];
  imageBase64?: string;
  imageFileName?: string;
  hasImageUpload: boolean;
  hasUrls: boolean;
  pinterestSource: boolean;
  sourceType: 'url' | 'pinterest' | 'upload';
  generateReferenceCode: boolean;
  extractRscPayload: boolean;
  forceRerun: boolean;
  analysisId: string;
}

/**
 * Runs the full analysis pipeline in the background.
 * Extracted from the /api/analyze route so the route only handles validation + response.
 */
export async function runAnalysisPipeline(opts: RunAnalysisPipelineOptions) {
  const {
    urls,
    imageBase64,
    imageFileName,
    hasImageUpload,
    hasUrls,
    pinterestSource,
    sourceType,
    generateReferenceCode,
    extractRscPayload,
    forceRerun,
    analysisId,
  } = opts;

  const send = (data: Record<string, unknown>) => {
    if (data.type === 'progress') {
      updateProgress(analysisId, {
        step: data.step as string,
        message: data.message as string,
        progress: data.progress as number,
      });
    } else if (data.type === 'result') {
      completeProgress(analysisId, data.data as Record<string, unknown>);
    } else if (data.type === 'error') {
      errorProgress(analysisId, data.message as string);
    } else if (data.type === 'warn') {
      // Warnings are not persisted — only shown if client is connected
      console.log(`[analyze][${analysisId}] warn: ${data.message}`);
    } else if (data.type === 'design_md') {
      updateProgress(analysisId, { designMd: data.content as string });
    } else if (data.type === 'reference_code') {
      updateProgress(analysisId, { referenceCode: data.content as string });
    } else if (data.type === 'code_preview') {
      updateProgress(analysisId, { codePreviewHtml: data.content as string });
    } else if (data.type === 'rsc_payload') {
      updateProgress(analysisId, { rscPayload: data.content as Record<string, unknown> });
    }
  };

  try {
    // ── SSRF protection (DNS lookup) ──
    if (hasUrls) {
      for (const url of urls) {
        const urlCheck = await validateExternalUrl(url);
        if (!urlCheck.safe) {
          errorProgress(analysisId, 'URL недоступен или запрещён');
          if (db) {
            await dbSafe(() =>
              db!.analysis.update({
                where: { id: analysisId },
                data: { status: 'error', error: 'URL недоступен или запрещён' },
              }),
            );
          }
          return;
        }
      }
    }

    // ── Dedup check (skip when forceRerun is true) ──
    if (db && hasUrls && !hasImageUpload && !forceRerun) {
      const sortedUrls = JSON.stringify([...urls].sort());
      const recentCompleted = await dbSafe(() =>
        db!.analysis.findMany({
          where: { status: 'completed' },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      );
      const existing = recentCompleted?.find((a) => {
        try {
          return JSON.stringify([...JSON.parse(a.urls)].sort()) === sortedUrls;
        } catch {
          return false;
        }
      });
      if (existing) {
        const result = JSON.parse(existing.result || '{}');
        if (existing.designMd) result.designMd = existing.designMd;
        completeProgress(analysisId, result);
        return;
      }
    }

    // ── Init AI providers ──
    let zai: any;
    let primaryZai: any = null;
    const aiProviderRef = { current: 'zai' };

    try {
      updateProgress(analysisId, {
        step: 'init',
        message: 'Инициализирую AI-движок...',
        progress: 0.02,
      });
      primaryZai = await ZAI.create();
      zai = primaryZai;
    } catch (e) {
      console.warn(
        '[analyze] ZAI create failed, using Groq fallback:',
        e instanceof Error ? e.message : e,
      );
      zai = localProvider;
      aiProviderRef.current = 'groq';
      console.log(`[analyze][${analysisId}] warn: ZAI недоступен, использую Groq (без vision).`);
    }

    // ── Build pipeline context ──
    const adapter = createAdapter({ urls, imageBase64 });

    const ctx: PipelineContext = {
      urls,
      imageBase64,
      imageFileName,
      hasImageUpload,
      hasUrls,
      pinterestSource,
      sourceType,
      zai,
      primaryZai,
      aiProviderRef,
      pageContents: [],
      searchResults: [],
      extractedImageBase64: null,
      extractedImageUrl: null,
      vlmResult: null,
      designMdContent: null,
      techFingerprintsText: null,
      dataSources: [],
      pinterestData: null,
      generateReferenceCode,
      extractRscPayload,
      analysisResult: null,
      referenceCode: null,
      codePreviewHtml: null,
      rscPayload: null,
      analysisId,
      adapter,
      closeWriter: async () => {
        /* no-op in polling mode */
      },
      send,
    };

    // ── Build dynamic pipeline based on adapter capabilities ──
    const groups = buildPipeline({ adapter, generateReferenceCode, extractRscPayload });

    // ── Run steps (sequential + parallel groups) ──
    await runPipeline({
      ctx,
      groups,
      onError: async (ctx, error) => {
        const msg = error instanceof Error ? error.message : String(error);
        if (db && ctx.analysisId) {
          await dbSafe(() =>
            db!.analysis.update({
              where: { id: ctx.analysisId! },
              data: { status: 'error', error: msg },
            }),
          );
        }
      },
      onFinally: async () => {
        /* no-op */
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';
    console.error('[analyze] Unhandled error:', error);
    errorProgress(analysisId, msg);
    if (db) {
      await dbSafe(() =>
        db!.analysis.update({
          where: { id: analysisId },
          data: { status: 'error', error: msg },
        }),
      ).catch(() => {});
    }
  }
}
