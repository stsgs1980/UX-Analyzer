import type { AnalysisResult } from "@/store/analysis-store";

/**
 * Generates the Teardown (product overview) markdown section.
 */
export function renderTeardownSection(td: NonNullable<AnalysisResult["teardown"]>): string {
  const lines: string[] = [];
  lines.push("## 1. Обзор продукта (Teardown)\n");

  if (td.visualStyle) lines.push(`**Визуальный стиль:** ${td.visualStyle}`);
  if (td.type) lines.push(`**Тип продукта:** ${td.type}`);

  const techStack = Array.isArray(td.techStack) ? td.techStack : td.techStack ? [td.techStack] : [];
  if (techStack.length) lines.push(`**Технологический стек:** ${techStack.join(", ")}`);

  if (td.features?.length) {
    lines.push("\n### Ключевые возможности");
    td.features.forEach(f => lines.push(`- ${f}`));
  }
  if (td.interactions?.length) {
    lines.push("\n### Взаимодействия");
    td.interactions.forEach(i => lines.push(`- ${i}`));
  }
  if (td.inspiration?.length) {
    lines.push("\n### Источники вдохновения");
    td.inspiration.forEach(i => lines.push(`- ${i}`));
  }

  lines.push("\n---\n");
  return lines.join("\n");
}
