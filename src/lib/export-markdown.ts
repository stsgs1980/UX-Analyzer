import type { AnalysisResult } from "@/store/analysis-store";

/**
 * Compiles a full analysis result into a well-structured Markdown document.
 * Covers all sections: teardown, deconstruction, spec, reverse engineering,
 * audit, heuristic evaluation, VLM analysis, design system, RSC payload.
 */
export function buildMarkdownExport(result: AnalysisResult, designMdContent?: string | null): string {
  const lines: string[] = [];
  const td = result.teardown;
  const decon = result.deconstruction;
  const spec = result.spec;
  const rev = result.reverseEngineering;
  const audit = result.audit;
  const heur = result.heuristicEvaluation;
  const vlm = result.vlmAnalysis;
  const rsc = result.rscPayload;

  // ── Header ──
  const title = td?.title || result.url || "UX Analysis Report";
  const date = new Date().toLocaleDateString("ru-RU", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  lines.push(`# ${title}\n`);
  lines.push(`> Автоматически сгенерировано **UX-Analyzer**\n`);
  if (result.url) lines.push(`**URL:** ${result.url}`);
  if (result.sourceType) lines.push(`**Тип источника:** ${result.sourceType}`);
  if (td?.author) lines.push(`**Автор:** ${td.author}`);
  lines.push(`**Дата:** ${date}`);
  if (result.meta?.confidence) lines.push(`**Уверенность:** ${result.meta.confidence}`);
  if (result.meta?.dataSources?.length) lines.push(`**Источники данных:** ${result.meta.dataSources.join(", ")}`);
  lines.push("");
  lines.push("---\n");

  // ── Teardown ──
  if (td) {
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
  }

  // ── Deconstruction ──
  if (decon?.layers?.length) {
    lines.push("## 2. Деконструкция (Смысловые слои)\n");
    decon.layers.forEach(layer => {
      lines.push(`### ${layer.name}`);
      lines.push(`${layer.analysis}\n`);
    });
    if (decon.connections) {
      lines.push("### Связи между слоями");
      lines.push(decon.connections);
    }
    lines.push("\n---\n");
  }

  // ── Specification ──
  if (spec) {
    lines.push("## 3. Спецификация требований\n");

    if (spec.functionalRequirements?.length) {
      lines.push("### Функциональные требования");
      lines.push("| ID | Требование |");
      lines.push("|----|------------|");
      spec.functionalRequirements.forEach(fr => {
        lines.push(`| ${fr.id} | ${fr.statement} |`);
      });
      lines.push("");
    }

    if (spec.nonFunctionalRequirements?.length) {
      lines.push("### нефункциональные требования");
      lines.push("| ID | Категория | Требование |");
      lines.push("|----|-----------|------------|");
      spec.nonFunctionalRequirements.forEach(nfr => {
        lines.push(`| ${nfr.id} | ${nfr.category} | ${nfr.statement} |`);
      });
      lines.push("");
    }

    if (spec.userStories?.length) {
      lines.push("### Пользовательские истории");
      spec.userStories.forEach(us => {
        lines.push(`**${us.id}** — Как *${us.asRole}*, я хочу *${us.iWant}*, чтобы *${us.soThat}*.`);
        if (us.acceptanceCriteria?.length) {
          lines.push(`  **Критерии приёмки:**`);
          us.acceptanceCriteria.forEach(ac => lines.push(`  - [ ] ${ac}`));
        }
        lines.push("");
      });
    }
    lines.push("---\n");
  }

  // ── Reverse Engineering ──
  if (rev) {
    lines.push("## 4. Обратная инженерия (Архитектура)\n");
    const layers = [
      { label: "Frontend", data: rev.frontend },
      { label: "Анимации", data: rev.animationLib },
      { label: "Слой данных", data: rev.dataLayer },
      { label: "Backend", data: rev.backend },
      { label: "Инфраструктура", data: rev.infra },
    ];
    lines.push("| Слой | Стек | Уверенность | Обоснование |");
    lines.push("|------|------|-------------|-------------|");
    layers.forEach(({ label, data }) => {
      if (data?.stack) {
        lines.push(`| ${label} | ${data.stack} | ${data.confidence} | ${data.evidence} |`);
      }
    });
    lines.push("\n---\n");
  }

  // ── Audit ──
  if (audit?.problems?.length) {
    lines.push("## 5. Аудит UX (Проблемы)\n");
    lines.push("| Область | Серьёзность | Описание | Рекомендация |");
    lines.push("|---------|-------------|----------|--------------|");
    audit.problems.forEach(p => {
      lines.push(`| ${p.area} | **${p.severity}** | ${p.description} | ${p.recommendation} |`);
    });
    lines.push("\n---\n");
  }

  // ── Heuristic Evaluation ──
  if (heur) {
    lines.push("## 6. Эвристическая оценка (Nielsen)\n");

    if (heur.scores?.length) {
      lines.push("| Эвристика | Оценка (0-4) | Наблюдения | Рекомендация |");
      lines.push("|-----------|---------------|-------------|--------------|");
      heur.scores.forEach(s => {
        lines.push(`| ${s.heuristic} | ${s.score}/4 | ${s.observations} | ${s.recommendation} |`);
      });
      lines.push("");
    }

    if (heur.averageScore !== undefined) {
      lines.push(`**Средний балл:** ${heur.averageScore}/4`);
    }
    if (heur.verdict) {
      lines.push(`**Вердикт:** ${heur.verdict}`);
    }
    lines.push("\n---\n");
  }

  // ── VLM Analysis ──
  if (vlm) {
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
  }

  // ── Design System Document ──
  if (designMdContent) {
    lines.push("## 8. Design System Document\n");
    lines.push(designMdContent);
    lines.push("\n---\n");
  }

  // ── RSC Payload ──
  if (rsc) {
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
  }

  // ── Footer ──
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("*Generated by UX-Analyzer — AI-powered UX analysis tool*");

  return lines.join("\n");
}
