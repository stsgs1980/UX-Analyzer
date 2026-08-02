/**
 * Step: VLM visual analysis — analyze image with vision model.
 * Populates: vlmResult, dataSources
 */

import type { PipelineStep } from "../types";
import type { VlmAnalysisResult } from "@/lib/vlm-prompt";
import { VLM_ANALYSIS_PROMPT } from "@/lib/vlm-prompt";
import { withTimeout } from "../helpers";
import { extractJson } from "@/lib/extract-json";

export const vlmAnalysisStep: PipelineStep = {
  id: "vlm-analysis",
  label: "Визуальный анализ",

  async run(ctx) {
    if (!ctx.extractedImageBase64 || !ctx.primaryZai) {
      ctx.dataSources.push("url_only");
      return;
    }

    ctx.send({ type: "progress", step: "vlm", message: "Распознаю визуальный дизайн: цвета, типографику, компоновку...", progress: 0.38, analysisId: ctx.analysisId });

    try {
      console.log("[vlm] Starting VLM analysis, image size:", Math.round((ctx.extractedImageBase64!.length * 3) / 4 / 1024), "KB");
      const vlmResponse = await withTimeout(
        ctx.primaryZai.chat.completions.createVision({
          model: "default",
          messages: [{
            role: "user",
            content: [
              { type: "image_url", image_url: { url: ctx.extractedImageBase64 } },
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
        try {
          ctx.vlmResult = JSON.parse(jsonStr) as VlmAnalysisResult;
          ctx.dataSources.push("vlm");
          console.log("[vlm] Parsed OK, keys:", Object.keys(ctx.vlmResult));
          ctx.send({ type: "progress", step: "vlm", message: "Визуальный анализ завершён", progress: 0.48, analysisId: ctx.analysisId });
        } catch (parseErr) {
          console.warn("[vlm] Failed to parse VLM response:", parseErr);
          console.warn("[vlm] Raw JSON that failed:", jsonStr.substring(0, 500));
        }
      }
    } catch (e) {
      console.warn("[vlm] Failed:", e instanceof Error ? e.message : e);
    }
  },
};
