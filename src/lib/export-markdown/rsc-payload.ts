import type { AnalysisResult } from "@/store/analysis-store";

/**
 * Generates the RSC Payload (Next.js) markdown section.
 */
export function renderRscPayloadSection(rsc: NonNullable<AnalysisResult["rscPayload"]>): string {
  const lines: string[] = [];
  lines.push("## 9. RSC Payload (Next.js)\n");
  lines.push(`- **Next.js обнаружен:** ${rsc.isNextJs ? "Да" : "Нет"}`);

  if (rsc.serverComponents?.length) {
    lines.push(`- **Server Components:** ${rsc.serverComponents.join(", ")}`);
  }
  if (rsc.clientComponents?.length) {
    lines.push(`- **Client Components:** ${rsc.clientComponents.join(", ")}`);
  }
  if (rsc.fontPreloads?.length) {
    lines.push(`- **Шрифты:** ${rsc.fontPreloads.join(", ")}`);
  }
  if (rsc.scriptPreloads?.length) {
    lines.push(`- **Скрипты:** ${rsc.scriptPreloads.join(", ")}`);
  }
  if (rsc.summary) {
    lines.push(`\n${rsc.summary}`);
  }

  if (rsc.routeTree?.length) {
    lines.push("\n### Дерево маршрутов");
    lines.push("| Сегмент | Page | Layout | Loading | Error |");
    lines.push("|---------|------|--------|---------|-------|");
    rsc.routeTree.forEach(r => {
      lines.push(`| ${r.segment || "/"} | ${r.page || "—"} | ${r.layout || "—"} | ${r.loading || "—"} | ${r.error || "—"} |`);
    });
  }

  lines.push("\n---\n");
  return lines.join("\n");
}
