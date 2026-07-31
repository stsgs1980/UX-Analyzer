import { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { localProvider } from "@/lib/gemini-provider";
import { buildAnalysisPrompt } from "@/lib/analysis-prompt";
import { isPinterestPin, fetchPinterestOembed, downloadImageAsBase64 } from "@/lib/pinterest";
import { captureScreenshot } from "@/lib/screenshot";
import { extractTechFingerprints, formatFingerprintsForPrompt } from "@/lib/tech-fingerprints";
import { VLM_ANALYSIS_PROMPT, type VlmAnalysisResult } from "@/lib/vlm-prompt";
import { buildDesignMdPrompt } from "@/lib/design-md-prompt";
import { db } from "@/lib/db";
import { validateExternalUrl, isImageUrlSafe } from "@/lib/url-safety";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractJson } from "@/lib/extract-json";

interface PageContent {
  url: string;
  title: string;
  content: string;
  error?: string;
}

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

// ── Timeout helper ──
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/** Extract user-friendly message from ZAI SDK errors. */
function friendlyZaiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("insufficient_balance")) return "Недостаточно средств на балансе ZAI. Пополните баланс и попробуйте снова.";
  if (msg.includes("timed out")) return msg;
  if (msg.includes("API request failed")) {
    try {
      const jsonStr = msg.substring(msg.indexOf("{"));
      const parsed = JSON.parse(jsonStr);
      if (parsed.error?.message) return `Ошибка API: ${parsed.error.message}`;
    } catch {}
  }
  return msg;
}

/**
 * Try LLM call with primary provider, fallback to localProvider on ZAI errors.
 * Handles: insufficient_balance, API errors, timeouts.
 */
async function llmWithFallback(
  zai: any,
  primaryZai: any,
  params: { messages: Array<{ role: string; content: string }>; thinking?: { type: string } },
  timeoutMs: number,
  label: string,
  aiProviderRef: { current: string },
): Promise<{ choices: Array<{ message: { content: string } }> }> {
  // Try primary (ZAI) first
  if (primaryZai) {
    try {
      const result = await withTimeout(primaryZai.chat.completions.create(params), timeoutMs, label);
      return result as { choices: Array<{ message: { content: string } }> };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("insufficient_balance") || msg.includes("API request failed")) {
        console.warn(`[llm] ${label}: ZAI failed (${msg.substring(0, 100)}), falling back to Groq...`);
        aiProviderRef.current = "groq";
      } else {
        throw e; // Non-ZAI error, propagate
      }
    }
  }
  // Fallback to localProvider (Groq)
  return withTimeout(zai.chat.completions.create(params), timeoutMs, `${label} (Groq)`);
}

/** Safely run a DB operation, returning null on failure. */
async function dbSafe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.warn("[db] Operation skipped:", e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
  // C3: Rate limiting
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

  const body = await request.json();
  const { urls, imageBase64, imageFileName } = body as {
    urls?: string[];
    imageBase64?: string;
    imageFileName?: string;
  };

  // Determine analysis mode first (needed for size check)
  const hasImageUpload = !!imageBase64;

  // H3: Server-side image size validation (base64 ~33% overhead, max 15MB base64 = ~10MB image)
  if (hasImageUpload && imageBase64!.length > 15 * 1024 * 1024) {
    return Response.json({ error: "Изображение слишком большое (максимум 10 МБ)" }, { status: 400 });
  }

  const hasUrls = urls && Array.isArray(urls) && urls.length > 0;

  if (!hasImageUpload && !hasUrls) {
    return Response.json({ error: "Укажите URL или загрузите изображение" }, { status: 400 });
  }

  if (hasUrls && urls!.length > 10) {
    return Response.json({ error: "Максимум 10 URL за один запрос" }, { status: 400 });
  }

  // C2: SSRF protection — validate URLs
  if (hasUrls) {
    for (const url of urls!) {
      try { new URL(url); } catch {
        return Response.json({ error: "Некорректный формат URL" }, { status: 400 });
      }
      const urlCheck = await validateExternalUrl(url);
      if (!urlCheck.safe) {
        return Response.json({ error: "URL недоступен или запрещён" }, { status: 400 });
      }
    }
  }

  // Detect Pinterest source
  let pinterestSource = false;
  let pinterestData: { title: string; authorName: string; thumbnailUrl: string } | null = null;
  if (hasUrls) {
    for (const url of urls!) {
      if (isPinterestPin(url)) {
        pinterestSource = true;
        break;
      }
    }
  }

  const { readable, writable } = new TransformStream();
  const encoder = new TextEncoder();
  const writer = writable.getWriter();

  const send = (data: Record<string, unknown>) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Dedup: check if same URLs were already analyzed successfully
  if (db && hasUrls && !hasImageUpload) {
    const sortedUrls = JSON.stringify([...urls!].sort());
    // H4: Fetch recent completed analyses for proper dedup
    const recentCompleted = await dbSafe(() =>
      db!.analysis.findMany({
        where: { status: "completed" },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    );
    const existing = recentCompleted?.find(
      (a) => { try { return JSON.stringify([...JSON.parse(a.urls)].sort()) === sortedUrls; } catch { return false; } }
    );
    if (existing) {
      return new Response(
        new ReadableStream({
          start(controller) {
            const enc = new TextEncoder();
            const result = JSON.parse(existing.result || "{}");
            if (existing.designMd) result.designMd = existing.designMd;
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "result", data: result, analysisId: existing.id })}\n\n`));
            controller.close();
          },
        }),
        { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } }
      );
    }
  }

  // Determine source type for DB
  const sourceType = hasImageUpload ? "upload" : pinterestSource ? "pinterest" : "url";

  // Create DB record
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

  // ════════════════════════════════════════════════════════════════
  //  MAIN PIPELINE — runs async, streams progress via SSE
  // ════════════════════════════════════════════════════════════════
  (async () => {
    let zai: any;
    let primaryZai: any = null;
    let aiProvider = "zai";
    const aiProviderRef = { current: "zai" };
    try {
      send({ type: "progress", step: "init", message: "Инициализирую AI-движок...", progress: 0.02, analysisId: analysis?.id });
      primaryZai = await ZAI.create();
      zai = primaryZai;
    } catch (e) {
      console.warn("[analyze] ZAI create failed, using Groq fallback:", e instanceof Error ? e.message : e);
      zai = localProvider;
      aiProviderRef.current = "groq";
      send({ type: "warn", message: "ZAI недоступен, использую Groq (без vision).", analysisId: analysis?.id });
    }
    const pageContents: PageContent[] = [];
    const searchResults: SearchResult[] = [];
    let extractedImageBase64: string | null = null;
    let extractedImageUrl: string | null = null;
    let vlmResult: VlmAnalysisResult | null = null;
    let designMdContent: string | null = null;
    let techFingerprintsText: string | null = null;
    const dataSources: string[] = [];

    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    try {
      // ═══ STEP 0: Pinterest oEmbed ═══
      if (pinterestSource && hasUrls) {
        send({ type: "progress", step: "pinterest", message: "Получаю данные пина из Pinterest...", progress: 0.06, analysisId: analysis?.id });

        for (const url of urls!) {
          if (isPinterestPin(url)) {
            try {
              const pinData = await withTimeout(fetchPinterestOembed(url), 8000, "Pinterest oEmbed");
              console.log("[pinterest] oEmbed result:", pinData ? `OK (title: ${pinData.title}, thumb: ${pinData.thumbnailUrl?.substring(0, 80)}...)` : "NULL");
              if (pinData) {
                pinterestData = { title: pinData.title, authorName: pinData.authorName, thumbnailUrl: pinData.thumbnailUrl };
                if (pinData.thumbnailUrl) {
                  send({ type: "progress", step: "pinterest", message: `Скачиваю обложку: ${pinData.title || 'пин'}...`, progress: 0.10, analysisId: analysis?.id });
                  const imgBase64 = await withTimeout(downloadImageAsBase64(pinData.thumbnailUrl), 15000, "Pinterest image");
                  console.log("[pinterest] image download:", imgBase64 ? `OK (${Math.round(imgBase64.length / 1024)}KB base64)` : "FAILED");
                  if (imgBase64) { extractedImageBase64 = imgBase64; extractedImageUrl = pinData.thumbnailUrl; }
                  dataSources.push("pinterest");
                } else {
                  console.warn("[pinterest] No thumbnailUrl in oEmbed response");
                }
              }
            } catch (e) {
              console.warn("[pinterest] Failed:", e);
            }
            break;
          }
        }
      }

      // ═══ STEP 0b: Uploaded image ═══
      if (hasImageUpload && imageBase64) {
        send({ type: "progress", step: "upload", message: "Изображение загружено, начинаю анализ...", progress: 0.10, analysisId: analysis?.id });
        extractedImageBase64 = imageBase64;
        dataSources.push("image_upload");
      }

      // ═══ STEP 0c: Direct image URL ═══
      if (!extractedImageBase64 && hasUrls && !pinterestSource) {
        const firstUrl = urls![0];
        const isImageUrl = /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(firstUrl);
        if (isImageUrl && isImageUrlSafe(firstUrl)) {
          send({ type: "progress", step: "downloading_image", message: "Скачиваю изображение по URL...", progress: 0.10, analysisId: analysis?.id });
          try {
            const imgBase64 = await withTimeout(downloadImageAsBase64(firstUrl), 15000, "Image download");
            if (imgBase64) { extractedImageBase64 = imgBase64; extractedImageUrl = firstUrl; dataSources.push("image_url"); }
          } catch (e) {
            console.warn("[image] Download failed:", e);
          }
        }
      }

      // ═══ STEP 1+2: Fetch pages AND search IN PARALLEL ═══
      if (hasUrls && !hasImageUpload) {
        const urlCount = urls!.length;
        const fetchMsg = urlCount === 1 ? "Читаю страницу и ищу контекст..." : "Читаю " + urlCount + " страницы и ищу контекст...";
        send({ type: "progress", step: "fetching", message: fetchMsg, progress: 0.14, analysisId: analysis?.id });
        const [fetchOutcome, searchOutcome] = await Promise.allSettled([
          // --- page_reader for all URLs ---
          (async () => {
            // We need raw HTML for tech fingerprinting, but also stripped content for LLM
            const results = await Promise.allSettled(
              urls!.map(async url => {
                try {
                  const r = await withTimeout(
                    zai.functions.invoke("page_reader", { url }),
                    15000,
                    `page_reader(${url})`
                  );
                  const rawHtml = (r as any).data?.html || "";
                  
                  // Extract tech fingerprints from first successful page
                  if (!techFingerprintsText && rawHtml) {
                    const fp = extractTechFingerprints(rawHtml);
                    techFingerprintsText = formatFingerprintsForPrompt(fp);
                    console.log("[tech-fp] Extracted from", url);
                  }
                  
                  return {
                    url,
                    title: (r as any).data?.title || "Без заголовка",
                    content: rawHtml
                      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                      .replace(/<[^>]*>/g, " ")
                      .replace(/\s+/g, " ")
                      .trim(),
                  };
                } catch (err) {
                  return { url, title: "Недоступно", content: "", error: err instanceof Error ? err.message : "timeout" };
                }
              })
            );
            return results.filter((r): r is PromiseFulfilledResult<PageContent> => r.status === "fulfilled").map(r => r.value);
          })(),
          // --- web_search for first 2 URLs ---
          (async () => {
            const results = await Promise.allSettled(
              urls!.slice(0, 2).map(async url => {
                const hostname = new URL(url).hostname;
                const query = `${hostname} design UI UX review`;
                const items = await withTimeout(
                  zai.functions.invoke("web_search", { query, num: 3 }),
                  10000,
                  `web_search(${hostname})`
                );
                return ((items || []) as Array<{ url: string; name: string; snippet: string }>)
                  .slice(0, 2)
                  .map(r => ({ url: r.url, title: r.name, snippet: r.snippet }));
              })
            );
            return results
              .filter((r): r is PromiseFulfilledResult<SearchResult[]> => r.status === "fulfilled")
              .flatMap(r => r.value);
          })(),
        ]);

        if (fetchOutcome.status === "fulfilled") pageContents.push(...fetchOutcome.value);
        if (pageContents.some(p => !p.error)) dataSources.push("page_reader");
        if (searchOutcome.status === "fulfilled" && searchOutcome.value.length > 0) {
          searchResults.push(...searchOutcome.value);
          dataSources.push("web_search");
        }

        const okPages = pageContents.filter(p => !p.error).length;
        send({ type: "progress", step: "fetching", message: `Получено ${okPages} ${okPages === 1 ? 'страница' : 'страниц'}, ${searchResults.length} результатов поиска`, progress: 0.32, analysisId: analysis?.id });
      } else if (hasImageUpload) {
        send({ type: "progress", step: "fetching", message: "Изображение готово к анализу", progress: 0.20, analysisId: analysis?.id });
      }

      // ═══ STEP 2a: Screenshot (if no image yet) ═══
      if (!extractedImageBase64 && hasUrls && !pinterestSource && urls![0]) {
        const firstUrl = urls![0];
        console.log("[screenshot] Trying to capture:", firstUrl);
        const ss = await withTimeout(captureScreenshot(firstUrl), 30000, "screenshot");
        if (ss) {
          extractedImageBase64 = ss.base64;
          extractedImageUrl = firstUrl;
          dataSources.push("screenshot");
          console.log("[screenshot] Captured via", ss.source);
        }
      }

      // ═══ STEP 2b: VLM visual analysis ═══
      if (extractedImageBase64 && primaryZai) {
        send({ type: "progress", step: "vlm", message: "Распознаю визуальный дизайн: цвета, типографику, компоновку...", progress: 0.38, analysisId: analysis?.id });

        try {
          console.log("[vlm] Starting VLM analysis, image size:", Math.round((extractedImageBase64!.length * 3) / 4 / 1024), "KB");
          const vlmResponse = await withTimeout(
            primaryZai.chat.completions.createVision({
              model: "default",
              messages: [{
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: extractedImageBase64 } },
                  { type: "text", text: VLM_ANALYSIS_PROMPT },
                ],
              }],
              thinking: { type: "disabled" },
            }),
            30000,
            "VLM analysis"
          );

          const vlmText = (vlmResponse as any)?.choices?.[0]?.message?.content || "";
          console.log("[vlm] Response length:", vlmText.length, vlmText ? "(has content)" : "(EMPTY!)");
          if (vlmText) {
            const jsonStr = extractJson(vlmText);
            console.log("[vlm] Extracted JSON length:", jsonStr.length, "first 100 chars:", jsonStr.substring(0, 100));
            try {
              vlmResult = JSON.parse(jsonStr) as VlmAnalysisResult;
              dataSources.push("vlm");
              console.log("[vlm] Parsed OK, keys:", Object.keys(vlmResult));
              send({ type: "progress", step: "vlm", message: "Визуальный анализ завершён", progress: 0.48, analysisId: analysis?.id });
            } catch (parseErr) {
              console.warn("[vlm] Failed to parse VLM response:", parseErr);
              console.warn("[vlm] Raw JSON that failed:", jsonStr.substring(0, 500));
            }
          }
        } catch (e) {
          console.warn("[vlm] Failed:", e instanceof Error ? e.message : e);
        }
      } else {
        dataSources.push("url_only");
      }

      // ═══ STEP 3: Main LLM analysis ═══
      send({ type: "progress", step: "preparing", message: "Компоную данные для AI-анализа...", progress: 0.52, analysisId: analysis?.id });

      const prompt = buildAnalysisPrompt(
        hasImageUpload ? [] : urls!,
        pageContents,
        searchResults,
        vlmResult,
        hasImageUpload ? "upload" : pinterestSource ? "pinterest" : "url",
        imageFileName || undefined,
        techFingerprintsText
      );

      // Heartbeat: send progress updates while LLM is thinking (0.52 → 0.80)
      const methods = ["Анализ визуального стиля", "Оценка архитектуры", "Майнинг UX-паттернов", "Реверс-инжиниринг стека", "Эвристическая оценка", "Создание спецификаций", "Генерация пользовательских историй", "Итоговый аудит"];
      let heartbeatIdx = 0;
      heartbeatInterval = setInterval(() => {
        if (heartbeatIdx < methods.length) {
          const p = 0.52 + (0.80 - 0.52) * ((heartbeatIdx + 1) / methods.length);
          send({ type: "progress", step: "analyzing", message: `AI обрабатывает: ${methods[heartbeatIdx]}...`, progress: Math.round(p * 100) / 100, analysisId: analysis?.id });
          heartbeatIdx++;
        } else {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }
      }, 5000);

      const completion = await llmWithFallback(
        localProvider,
        primaryZai,
        {
          messages: [
            { role: "user", content: prompt },
          ],
          thinking: { type: "disabled" },
        },
        120000,
        "LLM analysis",
        aiProviderRef,
      );

      if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }

      let responseText = (completion as any)?.choices?.[0]?.message?.content || "";

      // ═══ STEP 4: Parse JSON ═══
      send({ type: "progress", step: "parsing", message: "Разбираю структуру результатов...", progress: 0.82, analysisId: analysis?.id });

      const jsonStr = extractJson(responseText);

      let analysisResult: Record<string, unknown>;
      try {
        analysisResult = JSON.parse(jsonStr);
      } catch {
        analysisResult = {
          type: hasImageUpload ? "upload" : (urls?.length === 1 ? "single" : "batch"),
          url: urls?.[0],
          parseError: "Не удалось разобрать JSON-ответ от LLM",
          rawResponse: responseText.substring(0, 2000),
        };
      }

      // Merge VLM results
      if (vlmResult) {
        analysisResult.vlmAnalysis = vlmResult;
      }

      // Add source metadata (DO NOT store full base64 in result)
      analysisResult.sourceType = sourceType;
      analysisResult.meta = {
        dataSources,
        aiProvider: aiProviderRef.current,
        confidence: pageContents.length > 0 || vlmResult ? "medium" : "low",
      };
      if (extractedImageUrl) analysisResult.extractedImageUrl = extractedImageUrl;
      if (pinterestData) analysisResult.pinterestData = pinterestData;
      // Only store image preview if it's a URL, not base64
      if (extractedImageUrl) analysisResult.imagePreviewUrl = extractedImageUrl;

      // ═══ STEP 5: DESIGN.md (only if VLM succeeded) ═══
      if (vlmResult) {
        send({ type: "progress", step: "design_md", message: "Создаю DESIGN.md на основе визуального анализа...", progress: 0.88, analysisId: analysis?.id });
        console.log("[design-md] VLM result available, generating DESIGN.md...");

        try {
          const sourceDescription = pinterestData
            ? "Pinterest: " + pinterestData.title + " by " + pinterestData.authorName
            : hasImageUpload
            ? "Uploaded: " + (imageFileName || "image")
            : urls?.[0] || "unknown";

          const designMdPrompt = buildDesignMdPrompt(vlmResult, sourceDescription);

          const designMdCompletion = await llmWithFallback(
            localProvider,
            primaryZai,
            {
              messages: [
                { role: "user", content: designMdPrompt },
              ],
              thinking: { type: "disabled" },
            },
            90000,
            "DESIGN.md generation",
            aiProviderRef,
          );

          designMdContent = (designMdCompletion as any)?.choices?.[0]?.message?.content || "";
          analysisResult.designMd = designMdContent;

          send({ type: "design_md", content: designMdContent, analysisId: analysis?.id });
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          console.warn("[design-md] Failed:", errMsg);
          send({ type: "warn", message: `DESIGN.md не сгенерирован: ${errMsg}`, analysisId: analysis?.id });
        }
      } else {
        console.log("[design-md] Skipped: vlmResult is", vlmResult);
        // Notify user that DESIGN.md won't be generated
        const reason = extractedImageBase64 ? "VLM не смог проанализировать изображение" : "Нет изображения для визуального анализа";
        send({ type: "warn", message: `DESIGN.md не сгенерирован: ${reason}`, analysisId: analysis?.id });
      }

      // ═══ STEP 6: Save to DB ═══
      send({ type: "progress", step: "saving", message: "Сохраняю результаты в базу...", progress: 0.93, analysisId: analysis?.id });
      if (db && analysis) {
        await dbSafe(() =>
          db!.analysis.update({
            where: { id: analysis.id },
            data: {
              result: JSON.stringify(analysisResult),
              status: "completed",
              imageUrl: extractedImageUrl || null,
              designMd: designMdContent || null,
            },
          })
        );
      }

      send({ type: "progress", step: "done", message: "Анализ завершён!", progress: 1, analysisId: analysis?.id });
      send({ type: "result", data: analysisResult, analysisId: analysis?.id });
    } catch (error) {
      if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
      const errorMsg = friendlyZaiError(error);
      console.error("[analyze] Pipeline error:", errorMsg);

      if (db && analysis) {
        await dbSafe(() =>
          db!.analysis.update({
            where: { id: analysis.id },
            data: { status: "error", error: errorMsg },
          })
        );
      }

      send({ type: "error", message: errorMsg, analysisId: analysis?.id });
    } finally {
      try { await writer.close(); } catch { /* already closed */ }
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Внутренняя ошибка сервера";
    console.error("[analyze] Unhandled error:", error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
