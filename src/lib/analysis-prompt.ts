import type { VlmAnalysisResult } from "./vlm-prompt";

export const ANALYSIS_SYSTEM_PROMPT = `Ты — старший продуктовый аналитик, объединяющий восемь профессиональных методологий анализа интерфейсов и продуктов. Твоя задача — по URL (или списку URL) и собранным данным произвести максимально полный инженерно-дизайнерский разбор и вернуть СТРОГО валидный JSON на русском языке.

═══════════════════════════════════════════════════════════════════
ВХОД
═══════════════════════════════════════════════════════════════════
Получишь:
  - urls: массив из 1..N ссылок
  - context: данные, собранные из web-search (сниппеты статей/блогов) и page_reader (содержимое страниц)
  - vlmAnalysis: (опц.) результаты визуального анализа через VLM
  - screenshots: (опц.) base64-кадры, если есть

═══════════════════════════════════════════════════════════════════
ВОСЕМЬ РАЗРЕЗОВ АНАЛИЗА (применяй все, где есть данные)
═══════════════════════════════════════════════════════════════════

1. DESIGN TEARDOWN — каталог решений по конкретному продукту
   Извлеки: визуальный стиль (палитра, типографика, дизайн-язык, сетка, плотность), вероятный tech stack, ключевые фичи, взаимодействия и анимации (микроинтеракции, hover, скролл-эффекты, жесты), и главное — «что стоит украсть» (практические идеи для воспроизведения).

2. DECONSTRUCTION — анализ внутренней структуры и смысловых слоёв
   Разбей продукт на слои: (а) информационная архитектура, (б) визуальная система, (в) сценарии использования, (г) скрытые допущения и ценности бренда. Покажи, как слои связаны и что каждый слой «говорит» зрителю.

3. SPEC EXTRACTION — формальная спецификация требований
   Преврати наблюдаемое поведение в формальные требования:
     - functional requirements (FR-001… FR-NNN)
     - non-functional requirements (NFR-…)
     - user stories с acceptance criteria (Given/When/Then)

4. PATTERN MINING — только если urls.length >= 2
   Агрегируй по всем референсам: какие решения повторяются, какие технологии доминируют, какие UX-паттерны встречаются чаще других.
   Если urls.length === 1 — верни null.

5. REVERSE ENGINEERING (поведенческий) — восстановление вероятной архитектуры по наблюдаемому поведению
   - вероятный фронтенд-стек и версия
   - библиотеки анимаций
   - состояние/данные
   - бэкенд-намёки
   - инфраструктура
   Помечай каждый вывод уверенностью: high/medium/low и обоснованием.

6. DESIGN/UX AUDIT — оценка ЧУЖОГО продукта
   Найди слабые места и рекомендации по улучшению:
   - проблемы в UX
   - визуальные проблемы
   - доступность (WCAG)
   - производительность
   Каждая проблема: severity (critical/major/minor), рекомендация.

7. HEURISTIC EVALUATION — оценка по 10 эвристикам Nielsen
   Для каждой из 10 эвристик: score (0-4), observations, recommendation.
   В конце — average score и общий вердикт.

8. VISUAL DESIGN SYSTEM — анализ визуальной дизайн-системы (если есть vlmAnalysis или изображение)
   На основе визуального анализа извлеки:
   - colorPalette: primary, secondary, accent, background, text + dominantColors с hex, name, usage, percentage
   - typography: headings (style, weight, characteristics), body (style, weight, characteristics), sizeScale
   - layout: gridType, spacing, alignment, density, maxContentWidth
   - components: массив из 3-10 компонентов с type, characteristics, states, borderRadius, shadows
   - visualEffects: массив эффектов (blur, gradient, glassmorphism, etc.) с описанием
   - moodAndTone: keywords + description
   - accessibilityNotes: замечания по доступности
   - uiPatterns: обнаруженные UI-паттерны
   Если данных для визуального анализа нет — верни null.

═══════════════════════════════════════════════════════════════════
ПРАВИЛА
═══════════════════════════════════════════════════════════════════
1. Отвечай ТОЛЬКО валидным JSON. Никакого markdown, никаких комментариев вне JSON.
2. Если данных недостаточно — ставь null или пустой массив, но не выдумывай.
3. Reverse engineering — только поведенческий, по визуальным признакам.
4. Heuristic evaluation — каждый score это число 0-4, не строка. averageScore — float.
5. Spec extraction — FR/NFR/US атомарные и тестируемые.
6. Pattern mining — только при batch (>=2 URL).
7. Audit — severity всегда указывай.
8. Все тексты — на русском языке. Технические термины оставляй на английском.
9. visualStyle: 2-4 предложения, techStack: 3-7 пунктов, inspiration: 2-4 пункта, audit problems: 3-8 штук.
10. Если URL — Instagram и контекста нет, верни минимальный каркас с confidence: "low".
11. Если передан vlmAnalysis — используй его как источник для Visual Design System и обогащай teardown.
`;

export function buildAnalysisPrompt(
  urls: string[],
  pageContents: Array<{ url: string; title: string; content: string; error?: string }>,
  searchResults: Array<{ url: string; title: string; snippet: string }>,
  vlmResult?: VlmAnalysisResult | null,
  sourceType?: string,
  imageFileName?: string
): string {
  const isBatch = urls.length >= 2;

  let dataSection = "═══════════ СОБРАННЫЕ ДАННЫЕ ═══════════\n\n";

  // Source type indicator
  if (sourceType) {
    dataSection += `Источник: ${sourceType}${imageFileName ? ` (${imageFileName})` : ""}\n\n`;
  }

  // Add VLM analysis results if available
  if (vlmResult) {
    dataSection += "── ДАННЫЕ VLM (визуальный анализ) ──\n";
    dataSection += JSON.stringify(vlmResult, null, 2);
    dataSection += "\n\n";
  }

  // Add page reader results
  if (pageContents.length > 0) {
    dataSection += "── ДАННЫЕ PAGE_READER ──\n";
    for (const page of pageContents) {
      if (page.error) {
        dataSection += `\nURL: ${page.url}\nСТАТУС: ОШИБКА — ${page.error}\n`;
      } else {
        const truncatedContent = page.content.length > 6000
          ? page.content.substring(0, 6000) + "\n... [обрезано по длине]"
          : page.content;
        dataSection += `\nURL: ${page.url}\nЗаголовок: ${page.title}\nСодержимое:\n${truncatedContent}\n`;
      }
    }
    dataSection += "\n";
  }

  // Add search results
  if (searchResults.length > 0) {
    dataSection += "── ДАННЫЕ WEB_SEARCH (контекст) ──\n";
    for (const result of searchResults) {
      dataSection += `- ${result.title}\n  URL: ${result.url}\n  Сниппет: ${result.snippet}\n\n`;
    }
    dataSection += "\n";
  }

  if (pageContents.length === 0 && searchResults.length === 0 && !vlmResult) {
    dataSection += "ПРЕДУПРЕЖДЕНИЕ: Не удалось получить данные ни через page_reader, ни через web_search. Анализ будет основан только на URL.\n";
  }

  // Build the output format specification
  const singleFormat = `{
  "type": "${sourceType === 'upload' ? 'upload' : 'single'}",
  "url": "<первый URL>",
  "teardown": {
    "title": "...",
    "author": "..." | null,
    "source": "instagram|dribbble|website|pinterest|upload|...",
    "type": "reel|post|image|video|website|app",
    "visualStyle": "2-4 предложения: палитра, типографика, дизайн-язык, сетка, плотность",
    "techStack": "список технологий + короткое обоснование каждого",
    "features": ["фича 1", "фича 2"],
    "interactions": ["микроинтеракция", "hover", "скролл-эффект"],
    "inspiration": ["что украсть 1", "что украсть 2", "что украсть 3"]
  },
  "deconstruction": {
    "layers": [
      {"name": "информационная архитектура", "analysis": "..."},
      {"name": "визуальная система", "analysis": "..."},
      {"name": "сценарии использования", "analysis": "..."},
      {"name": "скрытые допущения и ценности бренда", "analysis": "..."}
    ],
    "connections": "как слои связаны между собой"
  },
  "spec": {
    "functionalRequirements": [
      {"id": "FR-001", "statement": "Система должна..."}
    ],
    "nonFunctionalRequirements": [
      {"id": "NFR-001", "category": "performance|a11y|compatibility|...", "statement": "..."}
    ],
    "userStories": [
      {
        "id": "US-001",
        "asRole": "...",
        "iWant": "...",
        "soThat": "...",
        "acceptanceCriteria": ["Given... When... Then..."]
      }
    ]
  },
  "patternMining": null,
  "reverseEngineering": {
    "frontend": {"stack": "...", "confidence": "high|medium|low", "evidence": "..."},
    "animationLib": {"stack": "...", "confidence": "...", "evidence": "..."},
    "dataLayer": {"stack": "...", "confidence": "...", "evidence": "..."},
    "backend": {"stack": "...", "confidence": "...", "evidence": "..."},
    "infra": {"stack": "...", "confidence": "...", "evidence": "..."}
  },
  "audit": {
    "problems": [
      {
        "area": "ux|visual|a11y|performance",
        "severity": "critical|major|minor",
        "description": "...",
        "recommendation": "..."
      }
    ]
  },
  "heuristicEvaluation": {
    "scores": [
      {"heuristic": "Visibility of system status", "score": 0, "observations": "...", "recommendation": "..."},
      {"heuristic": "Match between system and the real world", "score": 0, "observations": "...", "recommendation": "..."},
      {"heuristic": "User control and freedom", "score": 0, "observations": "...", "recommendation": "..."},
      {"heuristic": "Consistency and standards", "score": 0, "observations": "...", "recommendation": "..."},
      {"heuristic": "Error prevention", "score": 0, "observations": "...", "recommendation": "..."},
      {"heuristic": "Recognition rather than recall", "score": 0, "observations": "...", "recommendation": "..."},
      {"heuristic": "Flexibility and efficiency of use", "score": 0, "observations": "...", "recommendation": "..."},
      {"heuristic": "Aesthetic and minimalist design", "score": 0, "observations": "...", "recommendation": "..."},
      {"heuristic": "Help users recognize, diagnose, and recover from errors", "score": 0, "observations": "...", "recommendation": "..."},
      {"heuristic": "Help and documentation", "score": 0, "observations": "...", "recommendation": "..."}
    ],
    "averageScore": 0.0,
    "verdict": "1-2 предложения общий вывод"
  },
  "vlmAnalysis": null,
  "meta": {
    "dataSources": ["page_reader", "web_search", "vlm", "url_only", "image_upload"],
    "confidence": "high|medium|low",
    "caveats": ["ограничения анализа"]
  }
}`;

  const batchFormat = `{
  "type": "batch",
  "totalUrls": ${urls.length},
  "perUrl": [ <single-объект для каждого URL> ],
  "patternMining": {
    "groups": [
      {
        "category": "visual-style|tech-stack|interactions|features",
        "patterns": [
          {
            "name": "краткое название",
            "count": <число>,
            "percentage": <0-100>,
            "examples": ["title1", "title2"],
            "takeaway": "что это значит для практика"
          }
        ]
      }
    ],
    "summary": "общая характеристика коллекции"
  },
  "crossCuttingThemes": ["тема 1", "тема 2"],
  "meta": {
    "dataSources": [],
    "confidence": "high|medium|low",
    "caveats": []
  }
}`;

  const outputFormat = isBatch
    ? `═══════════ ФОРМАТ ВЫВОДА (batch, ${urls.length} URL) ═══════════\n\n${batchFormat}`
    : `═══════════ ФОРМАТ ВЫВОДА (single) ═══════════\n\n${singleFormat}`;

  return `${ANALYSIS_SYSTEM_PROMPT}\n\n${dataSection}\n\n${outputFormat}\n\nURL для анализа: ${urls.length > 0 ? urls.join(", ") : "(изображение)"}`;
}
