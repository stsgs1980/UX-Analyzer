/**
 * Step: Generate DESIGN.md from VLM results.
 * Populates: designMdContent (and sets it on analysisResult.designMd)
 */

import type { PipelineStep } from "../types";
import { buildDesignMdPrompt } from "@/lib/design-md-prompt";
import { localProvider } from "@/lib/gemini-provider";
import { llmWithFallback, dbSafe } from "../helpers";

export const designMdStep: PipelineStep = {
  id: "design-md",
  label: "DESIGN.md",

  async run(ctx) {
    if (!ctx.vlmResult) {
      console.log("[design-md] Skipped: vlmResult is", ctx.vlmResult);
      const reason = ctx.extractedImageBase64 ? "VLM не смог проанализировать изображение" : "Нет изображения для визуального анализа";
      ctx.send({ type: "warn", message: `DESIGN.md не сгенерирован: ${reason}`, analysisId: ctx.analysisId });
      return;
    }

    ctx.send({ type: "progress", step: "design_md", message: "Создаю DESIGN.md на основе визуального анализа...", progress: 0.88, analysisId: ctx.analysisId });
    console.log("[design-md] VLM result available, generating DESIGN.md...");

    try {
      const sourceDescription = ctx.sourceDescription
        || ctx.urls[0]
        || "unknown";

      const designMdPrompt = buildDesignMdPrompt(ctx.vlmResult, sourceDescription);

      const designMdCompletion = await llmWithFallback(
        localProvider,
        ctx.primaryZai,
        {
          messages: [{ role: "user", content: designMdPrompt }],
          thinking: { type: "disabled" },
        },
        90000,
        "DESIGN.md generation",
        ctx.aiProviderRef,
      );

      ctx.designMdContent = (designMdCompletion as any)?.choices?.[0]?.message?.content || "";
      if (ctx.analysisResult) {
        (ctx.analysisResult as any).designMd = ctx.designMdContent;
      }
      ctx.send({ type: "design_md", content: ctx.designMdContent, analysisId: ctx.analysisId });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.warn("[design-md] Failed:", errMsg);
      ctx.send({ type: "warn", message: `DESIGN.md не сгенерирован: ${errMsg}`, analysisId: ctx.analysisId });
    }
  },
};
