/**
 * Step: Fetch source content via adapter.
 *
 * This step calls `ctx.adapter.fetch()` and populates the pipeline context
 * with images, metadata, source code, and additional pages.
 * Replaces the old source-type branching logic (pinterest oEmbed, image upload, direct image URL).
 */

import type { PipelineStep } from "../types";

export const fetchSourceStep: PipelineStep = {
  id: "fetch-source",
  label: "Загрузка источника",

  async run(ctx) {
    const aid = ctx.analysisId;

    // Build fetch context from pipeline context
    const fetchCtx = {
      urls: ctx.urls,
      imageBase64: ctx.imageBase64,
      imageFileName: ctx.imageFileName,
      zai: ctx.zai,
    };

    // Progress messages per adapter type
    const messages: Record<string, string> = {
      pinterest: "Получаю данные пина из Pinterest...",
      "pinterest-board": "Получаю данные доски из Pinterest...",
      image: ctx.imageBase64 ? "Изображение загружено, начинаю анализ..." : "Скачиваю изображение по URL...",
      url: "Загружаю страницу для анализа...",
      dribbble: "Получаю данные shot из Dribbble...",
      behance: "Получаю данные проекта из Behance...",
      codepen: "Получаю данные из CodePen...",
      github: "Получаю данные репозитория из GitHub...",
    };

    const msg = messages[ctx.adapter.type] || "Загрузка источника...";
    ctx.send({ type: "progress", step: "fetching", message: msg, progress: 0.06, analysisId: aid });

    // Call adapter
    const result = await ctx.adapter.fetch(fetchCtx);

    // Populate pipeline context from adapter result

    // Images → extractedImageBase64 (primary image for VLM)
    if (result.images.length > 0) {
      ctx.extractedImageBase64 = result.images[0].base64;
      ctx.extractedImageUrl = result.images[0].url || null;
    }

    // Metadata
    ctx.metadata = result.metadata;

    // Build sourceDescription for LLM prompts
    if (ctx.metadata) {
      const parts: string[] = [];
      if (ctx.adapter.type === "pinterest") {
        parts.push("Pinterest:");
        if (ctx.metadata.title) parts.push(ctx.metadata.title);
        if (ctx.metadata.author) parts.push("by", ctx.metadata.author);
        ctx.pinterestData = {
          title: ctx.metadata.title,
          authorName: ctx.metadata.author || "",
          thumbnailUrl: ctx.metadata.thumbnailUrl || "",
        };
      } else if (ctx.adapter.type === "image") {
        parts.push("Uploaded:");
        parts.push(ctx.imageFileName || "image");
      } else {
        parts.push(ctx.metadata.title || ctx.urls[0] || "unknown");
      }
      ctx.sourceDescription = parts.join(" ");
    }

    // Source code (for code adapters)
    if (result.sourceCode) {
      ctx.sourceCode = result.sourceCode;
      ctx.sourceCodeLanguage = result.sourceCodeLanguage || null;
    }

    // Additional pages from adapter
    if (result.additionalPages && result.additionalPages.length > 0) {
      ctx.pageContents.push(...result.additionalPages);
    }

    // Track data source
    ctx.dataSources.push(ctx.adapter.type);

    ctx.send({
      type: "progress",
      step: "fetched",
      message: `Источник загружен: ${ctx.adapter.label}`,
      progress: 0.10,
      analysisId: aid,
    });
  },
};
