import { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { localProvider } from "@/lib/gemini-provider";
import { db } from "@/lib/db";
import { validateExternalUrl } from "@/lib/url-safety";
import { checkRateLimit } from "@/lib/rate-limit";
import { dbSafe } from "@/lib/pipeline/helpers";
import { runPipeline } from "@/lib/pipeline/runner";
import { buildPipeline } from "@/lib/pipeline/pipeline-builder";
import { initProgress, updateProgress } from "@/lib/progress-store";
import { resolveSourceType } from "@/lib/source-adapters/registry";
import { createAdapter } from "@/lib/source-adapters/index";
import type { PipelineContext } from "@/lib/pipeline/types";
import type { SourceAdapter, SourceType } from "@/lib/source-adapters/types";

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
  // Basic URL format check (sync — no DNS)
  if (hasUrls) {
    for (const url of urls!) {
      try { new URL(url); } catch {
        return Response.json({ error: "Некорректный формат URL" }, { status: 400 });
      }
    }
  }

  // ── Resolve adapter via source-adapters registry ──
  const sourceType = resolveSourceType(urls || [], imageBase64);
  const adapter = createAdapter({ urls: urls || [], imageBase64, imageFileName, zai: null });
  const pinterestSource = sourceType === "pinterest" || sourceType === "pinterest-board";

  // ── Create DB record (lightweight — just an INSERT) ──
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

  const analysisId = analysis?.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ── Init progress store ──
  initProgress(analysisId);

  // ════════════════════════════════════════════════════════
  //  RETURN JSON IMMEDIATELY — pipeline runs in background
  // ════════════════════════════════════════════════════════

  // Fire-and-forget pipeline
  (async () => {
    try {
      // ── SSRF protection (DNS lookup) ──
      if (hasUrls) {
        for (const url of urls!) {
          const urlCheck = await validateExternalUrl(url);
          if (!urlCheck.safe) {
            updateProgress(analysisId, { status: "error", error: "URL недоступен или запрещён" });
            return;
          }
        }
      }

      // ── Dedup check (skip when forceRerun is true) ──
      if (db && hasUrls && !hasImageUpload && !forceRerun) {
        const sortedUrls = JSON.stringify([...urls!].sort());
        const recentCompleted = await dbSafe(() =>
          db!.analysis.findMany({ where: { status: "completed" }, orderBy: { createdAt: "desc" }, take: 50 })
        );
        const existing = recentCompleted?.find(
          (a) => { try { return JSON.stringify([...JSON.parse(a.urls)].sort()) === sortedUrls; } catch { return false; } }
        );
        if (existing) {
          const result = JSON.parse(existing.result || "{}");
          if (existing.designMd) result.designMd = existing.designMd;
          updateProgress(analysisId, {
            status: "completed",
            progress: 1,
            step: "done",
            message: "Результат найден в кэше",
            result,
            designMd: existing.designMd || null,
          });
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
        updateProgress(analysisId, { step: "init", message: "ZAI недоступен, использую Groq (без vision)." });
      }

      // ── Build pipeline context with progress-store send ──
      const send = (data: Record<string, unknown>) => {
        if (data.type === "progress") {
          updateProgress(analysisId, {
            progress: data.progress as number,
            step: data.step as string,
            message: data.message as string,
          });
        }
      };

      const ctx: PipelineContext = {
        urls: urls || [],
        imageBase64,
        imageFileName,
        adapter,
        sourceType,
        hasImageUpload,
        hasUrls: !!hasUrls,
        pinterestSource,
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
        metadata: null,
        sourceCode: null,
        sourceCodeLanguage: null,
        pinterestData: null,
        generateReferenceCode: !!generateReferenceCode,
        extractRscPayload: !!extractRscPayload,
        analysisResult: null,
        referenceCode: null,
        codePreviewHtml: null,
        rscPayload: null,
        analysisId,
        closeWriter: async () => {},  // no-op in polling mode
        send,
        sourceDescription: "",
      };

      // ── Build pipeline dynamically from adapter capabilities ──
      const groups = buildPipeline({
        adapter,
        generateReferenceCode: !!generateReferenceCode,
        extractRscPayload: !!extractRscPayload,
      });

      // ── Run steps (sequential + parallel groups) ──
      await runPipeline({
        ctx,
        groups,
        onError: async (ctx, error) => {
          const msg = error instanceof Error ? error.message : String(error);
          updateProgress(analysisId, { status: "error", error: msg });
          if (db && ctx.analysisId) {
            await dbSafe(() =>
              db!.analysis.update({
                where: { id: ctx.analysisId! },
                data: { status: "error", error: msg },
              })
            );
          }
        },
        onFinally: async () => {
          // Write final result to progress store if pipeline completed
          if (ctx.analysisResult) {
            updateProgress(analysisId, {
              status: "completed",
              progress: 1,
              step: "done",
              message: "Анализ завершён",
              result: ctx.analysisResult,
              designMd: ctx.designMdContent,
              referenceCode: ctx.referenceCode,
              codePreviewHtml: ctx.codePreviewHtml,
              rscPayload: ctx.rscPayload as Record<string, unknown> | null,
            });
          }
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Внутренняя ошибка сервера";
      console.error("[analyze] Unhandled error:", error);
      updateProgress(analysisId, { status: "error", error: msg });
    }
  })();

  return Response.json({ analysisId, status: "running" });
}
