import type { AnalysisResult } from "@/store/analysis-store";

/**
 * Generates the VLM (visual) analysis markdown section — the largest section
 * covering color palette, typography, layout, components, mood, accessibility,
 * and UI patterns.
 */
export function renderVlmAnalysisSection(vlm: NonNullable<AnalysisResult["vlmAnalysis"]>): string {
  const lines: string[] = [];
  lines.push("## 7. Визуальный анализ (VLM)\n");

  // Color palette
  if (vlm.colorPalette) {
    lines.push("### Палитра цветов");
    const cp = vlm.colorPalette;
    if (cp.dominantColors?.length) {
      lines.push("| Цвет | HEX | Назначение | Доля (%) |");
      lines.push("|------|-----|------------|----------|");
      cp.dominantColors.forEach(c => {
        lines.push(`| ${c.name} | \`${c.hex}\` | ${c.usage} | ${c.percentage}% |`);
      });
      lines.push("");
    }
    const colorGroups = [
      { label: "Основные", colors: cp.primary },
      { label: "Вторичные", colors: cp.secondary },
      { label: "Акцентные", colors: cp.accent },
      { label: "Фон", colors: cp.background },
      { label: "Текст", colors: cp.text },
    ];
    colorGroups.forEach(g => {
      if (g.colors?.length) {
        lines.push(`**${g.label}:** ${g.colors.map(c => `\`${c}\``).join(", ")}`);
      }
    });
    lines.push("");
  }

  // Typography
  if (vlm.typography) {
    lines.push("### Типографика");
    if (vlm.typography.headings) {
      const h = vlm.typography.headings;
      lines.push(`- **Заголовки:** ${h.style}, ${h.weight} — ${h.characteristics}`);
    }
    if (vlm.typography.body) {
      const b = vlm.typography.body;
      lines.push(`- **Основной текст:** ${b.style}, ${b.weight} — ${b.characteristics}`);
    }
    if (vlm.typography.sizeScale?.length) {
      lines.push(`- **Масштаб:** ${vlm.typography.sizeScale.join(" → ")}`);
    }
    lines.push("");
  }

  // Layout
  if (vlm.layout) {
    lines.push("### Сетка и компоновка");
    const l = vlm.layout;
    lines.push(`- **Тип сетки:** ${l.gridType}`);
    lines.push(`- **Отступы:** ${l.spacing}`);
    lines.push(`- **Выравнивание:** ${l.alignment}`);
    lines.push(`- **Плотность:** ${l.density}`);
    lines.push(`- **Макс. ширина контента:** ${l.maxContentWidth}`);
    lines.push("");
  }

  // Components
  if (vlm.components?.length) {
    lines.push("### Компоненты");
    vlm.components.forEach(c => {
      lines.push(`- **${c.type}:** ${c.characteristics}, скругление: ${c.borderRadius}, тени: ${c.shadows}, состояния: ${c.states.join(", ")}`);
    });
    lines.push("");
  }

  // Mood & Tone
  if (vlm.moodAndTone) {
    lines.push("### Настроение и тон");
    if (vlm.moodAndTone.keywords?.length) {
      lines.push(`**Ключевые слова:** ${vlm.moodAndTone.keywords.join(", ")}`);
    }
    if (vlm.moodAndTone.description) {
      lines.push(vlm.moodAndTone.description);
    }
    lines.push("");
  }

  // Accessibility
  if (vlm.accessibilityNotes?.length) {
    lines.push("### Доступность (Accessibility)");
    vlm.accessibilityNotes.forEach(n => lines.push(`- ${n}`));
    lines.push("");
  }

  // UI Patterns
  if (vlm.uiPatterns?.length) {
    lines.push("### UI паттерны");
    lines.push("| Паттерн | Описание |");
    lines.push("|---------|----------|");
    vlm.uiPatterns.forEach(p => {
      lines.push(`| ${p.pattern} | ${p.description} |`);
    });
    lines.push("");
  }

  lines.push("---\n");
  return lines.join("\n");
}
