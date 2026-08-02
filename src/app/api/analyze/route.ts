import { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { localProvider } from "@/lib/gemini-provider";
import { isPinterestPin } from "@/lib/pinterest";
import { db } from "@/lib/db";
import { validateExternalUrl } from "@/lib/url-safety";
import { checkRateLimit } from "@/lib/rate-limit";
import { dbSafe } from "@/lib/pipeline/helpers";
import { runPipeline } from "@/lib/pipeline/runner";
import type { PipelineContext } from "@/lib/pipeline/types";
import {
  initProgress,
  updateProgress,
  completeProgress,
  errorProgress,
} from "@/lib/progress-store";

// ── Pipeline steps ──
import { fetchSourceStep } from "@/lib/pipeline/steps/fetch-source";
import { fetchPagesStep } from "@/lib/pipeline/steps/fetch-pages";
import { screenshotStep } from "@/lib/pipeline/steps/screenshot";
import { vlmAnalysisStep } from "@/lib/pipeline/steps/vlm-analysis";
import { llmAnalysisStep } from "@/lib/pipeline/steps/llm-analysis";
import { designMdStep } from "@/lib/pipeline/steps/design-md";
import { dbSaveStep } from "@/lib/pipeline/steps/db-save";
import { referenceCodeStep } from "@/lib/pipeline/steps/reference-code";
import { rscExtractStep } from "@/lib/pipeline/steps/rsc-extract";

export async function POST(request: NextRequest) {
  // ── Rate limiting (lightweight, in-memory — no I/O) ──
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return Response.json(
      { error: "Слишком много запросов. Подождите минуту." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)), "X-RateLimit-Remaining": "0" },
      }
    );
  }

  // ── Parse input ──
  let body: { urls?: string[]; imageBase64?: string; imageFileName?: string; generateReferenceCode?: boolean; extractRscPayload?: boolean; forceRerun?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const { urls, imageBase64, imageFileName, generateReferenceCode, extractRscPayload, forceRerun } = body;

  const hasImageUpload = !!imageBase64;
  const hasUrls = urls && Array.isArray(urls) && urls.length > 0;

  // ── Lightweight validation (sync only, no I/O) ──
  if (hasImageUpload && imageBase64!.length > 15 * 1024 * 1024) {
    return Response.json({ error: "Изображение слишком большое (максимум 10 МБ)" }, { status: 400 });
  }
  if (!hasImageUpload && !hasUrls) {
    return Response.json({ error: "Укажите URL или загрузите изображение" }, { status: 400 });
  }
  if (hasUrls && urls!.length > 10) {
    return Response.json({ error: "Максимум 10 URL за один запрос" }, { status: 400 });
  }
  if (hasUrls) {
    for (const url of urls!) {
      try { new URL(url); } catch {
        return Response.json({ error: "Некорректный формат URL" }, { status: 400 });
      }
    }
  }

  // ── Detect Pinterest (sync) ──
  let pinterestSource = false;
  if (hasUrls) {
    for (const url of urls!) {
      if (isPinterestPin(url)) { pinterestSource = true; break; }
    }
  }

  // ════════════════════════════════════════════════════════
  //  POLLING ARCHITECTURE: return JSON immediately,
  //  pipeline runs in background, client polls for progress.
  // ════════════════════════════════════════════════════════

  const sourceType = hasImageUpload ? "upload" : pinterestSource ? "pinterest" : "url";

  // Create DB record FIRST so we have an ID
  const analysis = db
    ? await dbSafe(() =>
        db!.analysis.create({
          data: {
            urls: hasImageUpload ? JSON.stringify([]) : JSON.stringify(urls!),
            status: "running",
            sourceType,
          },
        })
      )
    : null;

  const analysisId = analysis?.id || `local-${Date.now()}`;

  // Initialize progress store entry
  initProgress(analysisId);

  // Fire-and-forget the pipeline
  runAnalysisPipeline({
    urls: urls || [],
    imageBase64,
    imageFileName,
    hasImageUpload: !!hasImageUpload,
    hasUrls: !!hasUrls,
    pinterestSource,
    sourceType,
    generateReferenceCode: !!generateReferenceCode,
    extractRscPayload: !!extractRscPayload,
    forceRerun: !!forceRerun,
    analysisId,
  }).catch((err) => {
    console.error("[analyze] Pipeline uncaught:", err);
  });

  // Return immediately — client will poll /api/analyze/progress/{id}
  return Response.json({ analysisId, status: "running" });
}

// ── Separate async function so errors don't bubble to the Response ──
async function runAnalysisPipeline(opts: {
  urls: string[];
  imageBase64?: string;
  imageFileName?: string;
  hasImageUpload: boolean;
  hasUrls: boolean;
  pinterestSource: boolean;
  sourceType: "url" | "pinterest" | "upload";
  generateReferenceCode: boolean;
  extractRscPayload: boolean;
  forceRerun: boolean;
  analysisId: string;
}) {
  const { urls, imageBase64, imageFileName, hasImageUpload, hasUrls, pinterestSource, sourceType, generateReferenceCode, extractRscPayload, forceRerun, analysisId } = opts;

  const send = (data: Record<string, unknown>) => {
    if (data.type === "progress") {
      updateProgress(analysisId, {
        step: data.step as string,
        message: data.message as string,
        progress: data.progress as number,
      });
    } else if (data.type === "result") {
      completeProgress(analysisId, data.data as Record<string, unknown>);
    } else if (data.type === "error") {
      errorProgress(analysisId, data.message as string);
    } else if (data.type === "warn") {
      // Warnings are not persisted — only shown if client is connected
      console.log(`[analyze][${analysisId}] warn: ${data.message}`);
    } else if (data.type === "design_md") {
      updateProgress(analysisId, { designMd: data.content as string });
    } else if (data.type === "reference_code") {
      updateProgress(analysisId, { referenceCode: data.content as string });
    } else if (data.type === "code_preview") {
      updateProgress(analysisId, { codePreviewHtml: data.content as string });
    } else if (data.type === "rsc_payload") {
      updateProgress(analysisId, { rscPayload: data.content as Record<string, unknown> });
    }
  };

  try {
    // ── SSRF protection (DNS lookup) ──
    if (hasUrls) {
      for (const url of urls) {
        const urlCheck = await validateExternalUrl(url);
        if (!urlCheck.safe) {
          errorProgress(analysisId, "URL недоступен или запрещён");
          if (db) {
            await dbSafe(() =>
              db!.analysis.update({
                where: { id: analysisId },
                data: { status: "error", error: "URL недоступен или запрещён" },
              })
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
        db!.analysis.findMany({ where: { status: "completed" }, orderBy: { createdAt: "desc" }, take: 50 })
      );
      const existing = recentCompleted?.find(
        (a) => { try { return JSON.stringify([...JSON.parse(a.urls)].sort()) === sortedUrls; } catch { return false; } }
      );
      if (existing) {
        const result = JSON.parse(existing.result || "{}");
        if (existing.designMd) result.designMd = existing.designMd;
        completeProgress(analysisId, result);
        return;
      }
    }

    // ── Init AI providers ──
    let zai: any;
    let primaryZai: any = null;
    const aiProviderRef = { current: "zai" };

    try {
      updateProgress(analysisId, { step: "init", message: "Инициализирую AI-движок...", progress: 0.02 });
      primaryZai = await ZAI.create();
      zai = primaryZai;
    } catch (e) {
      console.warn("[analyze] ZAI create failed, using Groq fallback:", e instanceof Error ? e.message : e);
      zai = localProvider;
      aiProviderRef.current = "groq";
      console.log(`[analyze][${analysisId}] warn: ZAI недоступен, использую Groq (без vision).`);
    }

    // ── Build pipeline context ──
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
      closeWriter: async () => { /* no-op in polling mode */ },
      send,
    };

    // ── Run steps (sequential + parallel groups) ──
    await runPipeline({
      ctx,
      groups: [
        fetchSourceStep,
        fetchPagesStep,
        screenshotStep,
        vlmAnalysisStep,
        llmAnalysisStep,
        [designMdStep, rscExtractStep],
        referenceCodeStep,
        dbSaveStep,
      ],
      onError: async (ctx, error) => {
        const msg = error instanceof Error ? error.message : String(error);
        if (db && ctx.analysisId) {
          await dbSafe(() =>
            db!.analysis.update({
              where: { id: ctx.analysisId! },
              data: { status: "error", error: msg },
            })
          );
        }
      },
      onFinally: async () => { /* no-op */ },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Внутренняя ошибка сервера";
    console.error("[analyze] Unhandled error:", error);
    errorProgress(analysisId, msg);
    if (db) {
      await dbSafe(() =>
        db!.analysis.update({
          where: { id: analysisId },
          data: { status: "error", error: msg },
        })
      ).catch(() => {});
    }
  }
}
