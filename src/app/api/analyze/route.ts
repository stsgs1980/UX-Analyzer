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

  // Run analysis asynchronously
  (async () => {
    const zai = await ZAI.create();
    const pageContents: PageContent[] = [];
    const searchResults: SearchResult[] = [];
    let extractedImageBase64: string | null = null;
    let extractedImageUrl: string | null = null;
    let vlmResult: VlmAnalysisResult | null = null;
    let designMdContent: string | null = null;

    try {
      // ═══════════ STEP 0: Pinterest oEmbed (if Pinterest URL) ═══════════
      if (pinterestSource && hasUrls) {
        send({
          type: "progress",
          step: "pinterest",
          message: "Извлекаю данные из Pinterest...",
          progress: 0.05,
          analysisId: analysis?.id,
        });

        for (const url of urls!) {
          if (isPinterestPin(url)) {
            const pinData = await fetchPinterestOembed(url);
            if (pinData) {
              pinterestData = {
                title: pinData.title,
                authorName: pinData.authorName,
                thumbnailUrl: pinData.thumbnailUrl,
              };
              // Download the pin image for VLM
              if (pinData.thumbnailUrl) {
                const imgBase64 = await downloadImageAsBase64(pinData.thumbnailUrl);
                if (imgBase64) {
                  extractedImageBase64 = imgBase64;
                  extractedImageUrl = pinData.thumbnailUrl;
                }
              }
              break;
            }
          }
        }
      }

      // ═══════════ STEP 0b: Use uploaded image ═══════════
      if (hasImageUpload && imageBase64) {
        extractedImageBase64 = imageBase64;
      }

      // ═══════════ STEP 0c: Download image from URL (if not Pinterest and not upload) ═══════════
      if (!extractedImageBase64 && hasUrls && !pinterestSource) {
        // Try to download the first URL as an image (direct image URLs)
        const firstUrl = urls![0];
        const isImageUrl = /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(firstUrl);
        if (isImageUrl) {
          send({
            type: "progress",
            step: "downloading_image",
            message: "Скачиваю изображение...",
            progress: 0.08,
            analysisId: analysis?.id,
          });
          const imgBase64 = await downloadImageAsBase64(firstUrl);
          if (imgBase64) {
            extractedImageBase64 = imgBase64;
            extractedImageUrl = firstUrl;
          }
        }
      }

      // ═══════════ STEP 1: Fetch page content via page_reader ═══════════
      if (hasUrls && !hasImageUpload) {
        send({
          type: "progress",
          step: "fetching",
          message: "Собираю данные со страниц...",
          progress: 0.12,
          analysisId: analysis?.id,
        });

        const fetchPromises = urls!.map(async (url) => {
          try {
            const result = await zai.functions.invoke("page_reader", { url });
            const htmlContent = result.data?.html || "";
            const plainText = htmlContent
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            return {
              url,
              title: result.data?.title || "Без заголовка",
              content: plainText,
            } as PageContent;
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return { url, title: "Недоступно", content: "", error: msg } as PageContent;
          }
        });

        const fetchResults = await Promise.allSettled(fetchPromises);
        for (const r of fetchResults) {
          if (r.status === "fulfilled") pageContents.push(r.value);
        }

        // Step 2: Web search for additional context
        send({
          type: "progress",
          step: "searching",
          message: "Ищу дополнительный контекст...",
          progress: 0.25,
          analysisId: analysis?.id,
        });

        const searchPromises = urls!.slice(0, 3).map(async (url) => {
          try {
            const hostname = new URL(url).hostname;
            const query = `${hostname} design UI UX review analysis`;
            const results = await zai.functions.invoke("web_search", { query, num: 5 });
            return (results || [])
              .slice(0, 3)
              .map((r: { url: string; name: string; snippet: string }) => ({
                url: r.url,
                title: r.name,
                snippet: r.snippet,
              })) as SearchResult[];
          } catch {
            return [] as SearchResult[];
          }
        });

        const searchFetchResults = await Promise.allSettled(searchPromises);
        for (const r of searchFetchResults) {
          if (r.status === "fulfilled") searchResults.push(...r.value);
        }
      } else if (hasImageUpload) {
        // Skip page fetching for image upload mode
        send({
          type: "progress",
          step: "fetching",
          message: "Изображение получено...",
          progress: 0.15,
          analysisId: analysis?.id,
        });
      }

      // ═══════════ STEP 2b: VLM visual analysis (if image available) ═══════════
      if (extractedImageBase64) {
        send({
          type: "progress",
          step: "downloading_image",
          message: "Анализирую изображение через VLM...",
          progress: 0.35,
          analysisId: analysis?.id,
        });

        try {
          const vlmResponse = await zai.chat.completions.createVision({
            model: "default",
            messages: [
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: extractedImageBase64 } },
                  { type: "text", text: VLM_ANALYSIS_PROMPT },
                ],
              },
            ],
            thinking: { type: "disabled" },
          });

          const vlmText = vlmResponse?.choices?.[0]?.message?.content || "";

          if (vlmText) {
            const jsonStr = extractJson(vlmText);
            try {
              vlmResult = JSON.parse(jsonStr) as VlmAnalysisResult;
            } catch {
              console.warn("[vlm] Failed to parse VLM response");
            }
          }
        } catch (e) {
          console.warn("[vlm] Image understanding failed:", e);
        }
      }

      // ═══════════ STEP 3: Build prompt and call LLM ═══════════
      send({
        type: "progress",
        step: "analyzing",
        message: "Запускаю AI-анализ (8 методологий)...",
        progress: 0.45,
        analysisId: analysis?.id,
      });

      const prompt = buildAnalysisPrompt(
        hasImageUpload ? [] : urls!,
        pageContents,
        searchResults,
        vlmResult,
        hasImageUpload ? "upload" : pinterestSource ? "pinterest" : "url",
        imageFileName || undefined
      );

      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: "" },
          { role: "user", content: prompt },
        ],
        thinking: { type: "disabled" },
      });

      let responseText = completion.choices[0]?.message?.content || "";

      // Step 4: Parse JSON from response
      send({
        type: "progress",
        step: "parsing",
        message: "Обрабатываю результаты...",
        progress: 0.8,
        analysisId: analysis?.id,
      });

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
          meta: {
            dataSources: pageContents.length > 0
              ? ["page_reader", "web_search"]
              : hasImageUpload
              ? ["image_upload"]
              : ["url_only"],
            confidence: "low",
            caveats: ["Ошибка парсинга JSON"],
          },
        };
      }

      // Merge VLM results into the analysis result
      if (vlmResult) {
        analysisResult.vlmAnalysis = vlmResult;
        if (!analysisResult.meta) analysisResult.meta = {};
        const meta = analysisResult.meta as Record<string, unknown>;
        const ds = (meta.dataSources as string[]) || [];
        if (!ds.includes("vlm")) ds.push("vlm");
        meta.dataSources = ds;
      }

      // Add source metadata
      analysisResult.sourceType = sourceType;
      if (extractedImageUrl) analysisResult.extractedImageUrl = extractedImageUrl;
      if (pinterestData) analysisResult.pinterestData = pinterestData;
      if (hasImageUpload && extractedImageBase64) {
        // Send a small preview URL (truncated base64 for preview)
        analysisResult.imagePreviewUrl = extractedImageBase64;
      }

      // ═══════════ STEP 5: Generate DESIGN.md (if VLM data available) ═══════════
      if (vlmResult) {
        send({
          type: "progress",
          step: "vlm_analysis",
          message: "Генерирую DESIGN.md...",
          progress: 0.88,
          analysisId: analysis?.id,
        });

        try {
          const sourceDescription = pinterestData
            ? `Pinterest: ${pinterestData.title} by ${pinterestData.authorName}`
            : hasImageUpload
            ? `Uploaded: ${imageFileName || "image"}`
            : urls?.[0] || "unknown";

          const designMdPrompt = buildDesignMdPrompt(vlmResult, sourceDescription);

          const designMdCompletion = await zai.chat.completions.create({
            messages: [
              { role: "assistant", content: "" },
              { role: "user", content: designMdPrompt },
            ],
            thinking: { type: "disabled" },
          });

          designMdContent = designMdCompletion.choices[0]?.message?.content || "";
          analysisResult.designMd = designMdContent;

          send({
            type: "design_md",
            content: designMdContent,
            analysisId: analysis?.id,
          });
        } catch (e) {
          console.warn("[design-md] Generation failed:", e);
        }
      }

      // Step 6: Save to DB
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

      send({
        type: "progress",
        step: "done",
        message: "Анализ завершён!",
        progress: 1,
        analysisId: analysis?.id,
      });

      send({
        type: "result",
        data: analysisResult,
        analysisId: analysis?.id,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Analysis error:", errorMsg);

      if (db && analysis) {
        await dbSafe(() =>
          db!.analysis.update({
            where: { id: analysis.id },
            data: { status: "error", error: errorMsg },
          })
        );
      }

      send({
        type: "error",
        message: `Ошибка анализа: ${errorMsg}`,
        analysisId: analysis?.id,
      });
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
