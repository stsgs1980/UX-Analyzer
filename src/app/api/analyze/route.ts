import { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { buildAnalysisPrompt } from "@/lib/analysis-prompt";
import { isPinterestPin, fetchPinterestOembed, downloadImageAsBase64 } from "@/lib/pinterest";
import { VLM_ANALYSIS_PROMPT, type VlmAnalysisResult } from "@/lib/vlm-prompt";
import { buildDesignMdPrompt } from "@/lib/design-md-prompt";
import { db } from "@/lib/db";

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

/** Safely run a DB operation, returning null on failure. */
async function dbSafe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.warn("[db] Operation skipped:", e);
    return null;
  }
}

/** Extract JSON from potentially markdown-wrapped LLM response. */
function extractJson(text: string): string {
  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }
  return jsonStr;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { urls, imageBase64, imageFileName } = body as {
    urls?: string[];
    imageBase64?: string;
    imageFileName?: string;
  };

  // Determine analysis mode
  const hasImageUpload = !!imageBase64;
  const hasUrls = urls && Array.isArray(urls) && urls.length > 0;

  if (!hasImageUpload && !hasUrls) {
    return Response.json({ error: "Укажите URL или загрузите изображение" }, { status: 400 });
  }

  if (hasUrls && urls!.length > 10) {
    return Response.json({ error: "Максимум 10 URL за один запрос" }, { status: 400 });
  }

  if (hasUrls) {
    for (const url of urls!) {
      try { new URL(url); } catch {
        return Response.json({ error: `Некорректный URL: ${url}` }, { status: 400 });
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
    const existing = await dbSafe(() =>
      db!.analysis.findFirst({
        where: { status: "completed" },
        orderBy: { createdAt: "desc" },
      })
    );
    if (existing && JSON.stringify([...JSON.parse(existing.urls)].sort()) === sortedUrls) {
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
    const zai = await ZAI.create();
    const pageContents: PageContent[] = [];
    const searchResults: SearchResult[] = [];
    let extractedImageBase64: string | null = null;
    let extractedImageUrl: string | null = null;
    let vlmResult: VlmAnalysisResult | null = null;
    let designMdContent: string | null = null;
    const dataSources: string[] = [];

    try {
      // ═══ STEP 0: Pinterest oEmbed ═══
      if (pinterestSource && hasUrls) {
        send({ type: "progress", step: "pinterest", message: "Извлекаю данные из Pinterest...", progress: 0.05, analysisId: analysis?.id });

        for (const url of urls!) {
          if (isPinterestPin(url)) {
            try {
              const pinData = await withTimeout(fetchPinterestOembed(url), 8000, "Pinterest oEmbed");
              if (pinData) {
                pinterestData = { title: pinData.title, authorName: pinData.authorName, thumbnailUrl: pinData.thumbnailUrl };
                if (pinData.thumbnailUrl) {
                  const imgBase64 = await withTimeout(downloadImageAsBase64(pinData.thumbnailUrl), 15000, "Pinterest image");
                  if (imgBase64) { extractedImageBase64 = imgBase64; extractedImageUrl = pinData.thumbnailUrl; }
                  dataSources.push("pinterest");
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
        extractedImageBase64 = imageBase64;
        dataSources.push("image_upload");
      }

      // ═══ STEP 0c: Direct image URL ═══
      if (!extractedImageBase64 && hasUrls && !pinterestSource) {
        const firstUrl = urls![0];
        const isImageUrl = /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(firstUrl);
        if (isImageUrl) {
          send({ type: "progress", step: "downloading_image", message: "Скачиваю изображение...", progress: 0.08, analysisId: analysis?.id });
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
        send({ type: "progress", step: "fetching", message: "Собираю данные (параллельно)...", progress: 0.12, analysisId: analysis?.id });

        const [fetchOutcome, searchOutcome] = await Promise.allSettled([
          // --- page_reader for all URLs ---
          (async () => {
            const results = await Promise.allSettled(
              urls!.map(url =>
                withTimeout(
                  zai.functions.invoke("page_reader", { url }).then(r => ({
                    url,
                    title: r.data?.title || "Без заголовка",
                    content: (r.data?.html || "")
                      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                      .replace(/<[^>]*>/g, " ")
                      .replace(/\s+/g, " ")
                      .trim(),
                  })),
                  15000,
                  `page_reader(${url})`
                ).catch(err => ({ url, title: "Недоступно", content: "", error: err instanceof Error ? err.message : "timeout" }))
              )
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
        if (searchOutcome.status === "fulfilled" && searchOutcome.value.length > 0) dataSources.push("web_search");

        send({ type: "progress", step: "searching", message: `Собрано: ${pageContents.length} страниц, ${searchResults.length} результатов поиска`, progress: 0.30, analysisId: analysis?.id });
      } else if (hasImageUpload) {
        send({ type: "progress", step: "fetching", message: "Изображение получено...", progress: 0.20, analysisId: analysis?.id });
      }

      // ═══ STEP 2b: VLM visual analysis ═══
      if (extractedImageBase64) {
        send({ type: "progress", step: "downloading_image", message: "Анализирую изображение через VLM...", progress: 0.40, analysisId: analysis?.id });

        try {
          const vlmResponse = await withTimeout(
            zai.chat.completions.createVision({
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

          const vlmText = vlmResponse?.choices?.[0]?.message?.content || "";
          if (vlmText) {
            const jsonStr = extractJson(vlmText);
            try {
              vlmResult = JSON.parse(jsonStr) as VlmAnalysisResult;
              dataSources.push("vlm");
            } catch {
              console.warn("[vlm] Failed to parse VLM response");
            }
          }
        } catch (e) {
          console.warn("[vlm] Failed:", e instanceof Error ? e.message : e);
        }
      } else {
        dataSources.push("url_only");
      }

      // ═══ STEP 3: Main LLM analysis ═══
      send({ type: "progress", step: "analyzing", message: "Запускаю AI-анализ (8 методологий)...", progress: 0.55, analysisId: analysis?.id });

      const prompt = buildAnalysisPrompt(
        hasImageUpload ? [] : urls!,
        pageContents,
        searchResults,
        vlmResult,
        hasImageUpload ? "upload" : pinterestSource ? "pinterest" : "url",
        imageFileName || undefined
      );

      const completion = await withTimeout(
        zai.chat.completions.create({
          messages: [
            { role: "assistant", content: "" },
            { role: "user", content: prompt },
          ],
          thinking: { type: "disabled" },
        }),
        60000,
        "LLM analysis"
      );

      let responseText = completion.choices[0]?.message?.content || "";

      // ═══ STEP 4: Parse JSON ═══
      send({ type: "progress", step: "parsing", message: "Обрабатываю результаты...", progress: 0.82, analysisId: analysis?.id });

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
        confidence: pageContents.length > 0 || vlmResult ? "medium" : "low",
      };
      if (extractedImageUrl) analysisResult.extractedImageUrl = extractedImageUrl;
      if (pinterestData) analysisResult.pinterestData = pinterestData;
      // Only store image preview if it's a URL, not base64
      if (extractedImageUrl) analysisResult.imagePreviewUrl = extractedImageUrl;

      // ═══ STEP 5: DESIGN.md (only if VLM succeeded) ═══
      if (vlmResult) {
        send({ type: "progress", step: "vlm_analysis", message: "Генерирую DESIGN.md...", progress: 0.88, analysisId: analysis?.id });

        try {
          const sourceDescription = pinterestData
            ? `Pinterest: ${pinterestData.title} by ${pinterestData.authorName}`
            : hasImageUpload
            ? `Uploaded: ${imageFileName || "image"}`
            : urls?.[0] || "unknown";

          const designMdPrompt = buildDesignMdPrompt(vlmResult, sourceDescription);

          const designMdCompletion = await withTimeout(
            zai.chat.completions.create({
              messages: [
                { role: "assistant", content: "" },
                { role: "user", content: designMdPrompt },
              ],
              thinking: { type: "disabled" },
            }),
            30000,
            "DESIGN.md generation"
          );

          designMdContent = designMdCompletion.choices[0]?.message?.content || "";
          analysisResult.designMd = designMdContent;

          send({ type: "design_md", content: designMdContent, analysisId: analysis?.id });
        } catch (e) {
          console.warn("[design-md] Failed:", e instanceof Error ? e.message : e);
        }
      }

      // ═══ STEP 6: Save to DB ═══
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
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[analyze] Pipeline error:", errorMsg);

      if (db && analysis) {
        await dbSafe(() =>
          db!.analysis.update({
            where: { id: analysis.id },
            data: { status: "error", error: errorMsg },
          })
        );
      }

      send({ type: "error", message: `Ошибка анализа: ${errorMsg}`, analysisId: analysis?.id });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
