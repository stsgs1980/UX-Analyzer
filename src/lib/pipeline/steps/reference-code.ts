/**
 * Pipeline step: Generate Reference Implementation Pipeline.
 * Uses analysis results + VLM data to create code-level implementation guide.
 * After generating code, also produces a standalone HTML preview.
 * Populates: referenceCode (string markdown), codePreviewHtml (string), adds to analysisResult.referenceCode
 *
 * This step is OPTIONAL — controlled by ctx.generateReferenceCode flag.
 */

import type { PipelineStep } from "../types";
import { buildReferenceCodePrompt } from "@/lib/reference-code-prompt";
import { localProvider } from "@/lib/gemini-provider";
import { llmWithFallback, withTimeout } from "../helpers";
import { extractJson } from "@/lib/extract-json";

export const referenceCodeStep: PipelineStep = {
  id: "reference-code",
  label: "Reference Pipeline",

  async run(ctx) {
    // Skip if not requested or no analysis result
    if (!ctx.generateReferenceCode) {
      return;
    }

    if (!ctx.analysisResult) {
      console.log("[reference-code] Skipped: no analysis result");
      return;
    }

    ctx.send({
      type: "progress",
      step: "reference_code",
      message: "Генерирую reference implementation pipeline...",
      progress: 0.91,
      analysisId: ctx.analysisId,
    });

    const sourceDescription = ctx.sourceDescription
      || ctx.urls[0]
      || "unknown";

    const prompt = buildReferenceCodePrompt(
      ctx.analysisResult,
      ctx.vlmResult,
      ctx.designMdContent,
      sourceDescription,
    );

    try {
      const completion = await llmWithFallback(
        localProvider,
        ctx.primaryZai,
        {
          messages: [{ role: "user", content: prompt }],
          thinking: { type: "disabled" },
        },
        120000,
        "Reference code generation",
        ctx.aiProviderRef,
      );

      const responseText = (completion as any)?.choices?.[0]?.message?.content || "";

      if (!responseText) {
        console.warn("[reference-code] Empty response from LLM");
        return;
      }

      // Try to parse as JSON, fallback to raw markdown
      const jsonStr = extractJson(responseText);
      let referenceData: Record<string, unknown>;

      try {
        referenceData = JSON.parse(jsonStr);
      } catch {
        // If JSON parse fails, wrap raw text
        referenceData = { raw: responseText, parseError: true };
      }

      // Convert to displayable markdown
      const referenceCode = formatReferenceCode(referenceData, sourceDescription);
      ctx.referenceCode = referenceCode;

      // Add to analysis result
      if (ctx.analysisResult) {
        (ctx.analysisResult as Record<string, unknown>).referenceCode = referenceData;
      }

      ctx.send({
        type: "reference_code",
        content: referenceCode,
        analysisId: ctx.analysisId,
      });

      console.log("[reference-code] Generated successfully, length:", referenceCode.length);

      // ── Phase 2: Generate live code preview HTML ──
      await generateCodePreview(ctx, referenceData, sourceDescription);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.warn("[reference-code] Failed:", errMsg);
      ctx.send({
        type: "warn",
        message: `Reference pipeline не сгенерирован: ${errMsg}`,
        analysisId: ctx.analysisId,
      });
    }
  },
};

/** Format reference data into readable markdown — exported for unit testing */
export function formatReferenceCode(data: Record<string, unknown>, source: string): string {
  const lines: string[] = [];

  lines.push(`# Reference Implementation Pipeline: ${source}`);
  lines.push("");
  lines.push(`> Автоматически сгенерировано UX-Analyzer`);
  lines.push("");

  // Estimated complexity & time
  if (data.estimatedComplexity) {
    lines.push(`**Сложность:** ${data.estimatedComplexity} | **Время:** ${data.estimatedTime || "N/A"}`);
    lines.push("");
  }

  // Dependencies
  if (data.dependencies && typeof data.dependencies === "object") {
    const deps = data.dependencies as Record<string, unknown>;
    lines.push("## Зависимости");
    lines.push("");
    if (deps.packages && Array.isArray(deps.packages)) {
      lines.push("```bash");
      lines.push(`bun add ${deps.packages.join(" ")}`);
      lines.push("```");
    }
    lines.push("");
  }

  // Design tokens
  if (data.designTokens && typeof data.designTokens === "object") {
    const tokens = data.designTokens as Record<string, unknown>;
    lines.push("## Design Tokens");
    lines.push("");
    if (tokens.cssVariables) {
      lines.push("### CSS Variables");
      lines.push("");
      lines.push("```css");
      lines.push(String(tokens.cssVariables));
      lines.push("```");
      lines.push("");
    }
    if (tokens.tailwindConfig) {
      lines.push("### Tailwind Config");
      lines.push("");
      lines.push("```js");
      lines.push(String(tokens.tailwindConfig));
      lines.push("```");
      lines.push("");
    }
  }

  // File structure
  if (data.fileStructure && typeof data.fileStructure === "object") {
    const fs = data.fileStructure as Record<string, unknown>;
    lines.push("## Файловая структура");
    lines.push("");
    lines.push("```");
    lines.push(String(fs.tree || fs.description || "N/A"));
    lines.push("```");
    lines.push("");
  }

  // Phases
  if (data.phases && Array.isArray(data.phases)) {
    const phases = data.phases as Array<Record<string, unknown>>;
    lines.push("## Фазы реализации");
    lines.push("");

    for (const phase of phases) {
      lines.push(`### Фаза ${phase.phase}: ${phase.name}`);
      lines.push("");
      lines.push(String(phase.description));
      lines.push("");

      if (Array.isArray(phase.steps)) {
        const steps = phase.steps as Array<Record<string, unknown>>;
        for (const step of steps) {
          lines.push(`#### Шаг ${step.order}: ${step.title}`);
          lines.push("");
          lines.push(String(step.description));
          lines.push("");

          if (step.files && Array.isArray(step.files)) {
            lines.push(`**Файлы:** ${(step.files as string[]).join(", ")}`);
            lines.push("");
          }

          if (step.code) {
            lines.push("```tsx");
            lines.push(String(step.code));
            lines.push("```");
            lines.push("");
          }

          if (step.notes) {
            lines.push(`> ${String(step.notes)}`);
            lines.push("");
          }
        }
      }
    }
  }

  lines.push("---");
  lines.push("Generated by UX-Analyzer — Pipeline Architecture");

  return lines.join("\n");
}

/**
 * Phase 2: Generate a standalone HTML preview from the reference code.
 * Asks LLM to produce a single-file HTML that renders the key component(s).
 * Populates: ctx.codePreviewHtml
 */
async function generateCodePreview(
  ctx: import("../types").PipelineContext,
  referenceData: Record<string, unknown>,
  sourceDescription: string,
): Promise<void> {
  ctx.send({
    type: "progress",
    step: "code_preview",
    message: "Генерирую live preview кода...",
    progress: 0.935,
    analysisId: ctx.analysisId,
  });

  // Collect code snippets from phases
  const codeSnippets: string[] = [];
  if (referenceData.phases && Array.isArray(referenceData.phases)) {
    for (const phase of referenceData.phases as Array<Record<string, unknown>>) {
      if (Array.isArray(phase.steps)) {
        for (const step of phase.steps as Array<Record<string, unknown>>) {
          if (step.code && typeof step.code === "string" && step.code.length > 20) {
            codeSnippets.push(step.code);
          }
        }
      }
    }
  }

  // Collect design tokens
  const designTokens = referenceData.designTokens as Record<string, unknown> | undefined;
  const tokensStr = designTokens?.cssVariables
    ? String(designTokens.cssVariables)
    : ":root { --primary: #10b981; --bg: #000; --text: #fff; }";

  // If we have no code snippets, skip preview
  if (codeSnippets.length === 0) {
    console.log("[code-preview] No code snippets found, skipping preview generation");
    return;
  }

  const previewPrompt = `Ты — senior frontend-разработчик. На основе сгенерированного reference implementation pipeline создай ОДИН самодостаточный HTML файл, который визуально демонстрирует ключевой компонент дизайна.

## Исходные данные
- Источник: ${sourceDescription}
- Design Tokens (CSS Variables):\n${tokensStr}
- Код компонентов из pipeline:\n${codeSnippets.slice(0, 5).join("\n\n---\n\n")}

## Требования к HTML

1. ОДИН самодостаточный HTML файл (всё inline: CSS в <style>, JS в <script>)
2. Используй CSS Variables из design tokens
3. Должен быть визуально похож на анализируемый дизайн
4. Отзывчивый: работает от 320px до 1440px
5. НЕ используй внешние CDN (кроме Google Fonts если нужно)
6. Минимальный, но реалистичный контент (тексты-заполнители)
7. Код должен быть чистым и хорошо прокомментированным
8. НЕ добавляй React/JSX — чистый HTML + CSS + vanilla JS

## Вывод

Верни ТОЛЬКО HTML код (без markdown-обёрток, без \`\`\`html). Начинай с <!DOCTYPE html>.`;

  try {
    const completion = await llmWithFallback(
      localProvider,
      ctx.primaryZai,
      {
        messages: [{ role: "user", content: previewPrompt }],
        thinking: { type: "disabled" },
      },
      90000,
      "Code preview generation",
      ctx.aiProviderRef,
    );

    let htmlText = (completion as any)?.choices?.[0]?.message?.content || "";

    // Strip markdown code block wrapper if present
    htmlText = htmlText.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();

    if (!htmlText.startsWith("<!DOCTYPE") && !htmlText.startsWith("<html")) {
      console.warn("[code-preview] Response is not valid HTML, skipping");
      return;
    }

    // Safety: sanitize — remove any script that accesses parent/window.top
    htmlText = htmlText.replace(/window\.parent/gi, "/* blocked */");
    htmlText = htmlText.replace(/window\.top/gi, "/* blocked */");

    ctx.codePreviewHtml = htmlText;

    ctx.send({
      type: "code_preview",
      content: htmlText,
      analysisId: ctx.analysisId,
    });

    console.log("[code-preview] Generated HTML preview, length:", htmlText.length);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.warn("[code-preview] Failed:", errMsg);
    ctx.send({
      type: "warn",
      message: `Live preview не сгенерирован: ${errMsg}`,
      analysisId: ctx.analysisId,
    });
  }
}
