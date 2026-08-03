import { NextRequest } from "next/server";
import { isPinterestPin } from "@/lib/pinterest";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { dbSafe } from "@/lib/pipeline/helpers";
import { initProgress } from "@/lib/progress-store";
import { runAnalysisPipeline } from "@/lib/pipeline/run-analysis";

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
