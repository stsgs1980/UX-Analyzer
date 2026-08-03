import type { VlmAnalysisResult } from './vlm-prompt';
import { fewShotExamples } from './few-shot-examples';

/**
 * Build a prompt for LLM to generate a Reference Implementation Pipeline
 * from analysis results + VLM visual data.
 */
export function buildReferenceCodePrompt(
  analysisResult: Record<string, unknown>,
  vlmResult: VlmAnalysisResult | null,
  designMdContent: string | null,
  sourceDescription: string,
): string {
  // Extract key fields from analysis result
  const teardown = analysisResult.teardown as Record<string, unknown> | undefined;
  const reverse = analysisResult.reverseEngineering as Record<string, unknown> | undefined;
  const deconstruction = analysisResult.deconstruction as Record<string, unknown> | undefined;
  const audit = analysisResult.audit as Record<string, unknown> | undefined;
  const spec = analysisResult.spec as Record<string, unknown> | undefined;
  const heuristics = analysisResult.heuristicEvaluation as Record<string, unknown> | undefined;

  let prompt = `Ты — senior frontend-архитектор. На основе полного UI-анализа страницы создай Reference Implementation Pipeline — документ с конкретными шагами для воспроизведения этого дизайна.

## Исходный анализ

### Teardown
${teardown ? JSON.stringify(teardown, null, 2) : 'Нет данных'}

### Reverse Engineering
${reverse ? JSON.stringify(reverse, null, 2) : 'Нет данных'}

### Deconstruction
${deconstruction ? JSON.stringify(deconstruction, null, 2) : 'Нет данных'}

### Audit
${audit ? JSON.stringify(audit, null, 2) : 'Нет данных'}

### Heuristic Evaluation
${heuristics ? JSON.stringify(heuristics, null, 2) : 'Нет данных'}
`;

  if (vlmResult) {
    prompt += `
### VLM Visual Analysis
${JSON.stringify(vlmResult, null, 2)}
`;
  }

  if (designMdContent) {
    prompt += `
### Design System Document (DESIGN.md)
${designMdContent.substring(0, 3000)}
`;
  }

  // Append few-shot examples (imported from separate module to avoid backtick conflicts)
  prompt += '\n\n---\n\n' + fewShotExamples + '\n\n---\n\n';

  prompt += `## Формат вывода

Верни СТРОГО валидный JSON (без markdown-обёрток):

{
  "title": "Reference Implementation Pipeline: ${sourceDescription}",
  "phases": [
    {
      "phase": 1,
      "name": "Название фазы",
      "description": "Описание что делаем",
      "steps": [
        {
          "order": 1,
          "title": "Название шага",
          "description": "Подробное описание",
          "files": ["path/to/file.tsx"],
          "code": "конкретный код или фрагмент (TypeScript/TSX/CSS)",
          "notes": "Примечания и советы"
        }
      ]
    }
  ],
  "fileStructure": {
    "description": "Описание файловой структуры проекта",
    "tree": "src/\\n├── app/\\n│   ├── page.tsx\\n│   └── layout.tsx\\n..."
  },
  "dependencies": {
    "description": "Список необходимых зависимостей",
    "packages": ["next@15", "react@19", "tailwindcss@3", ...]
  },
  "designTokens": {
    "cssVariables": ":root { --primary: #xxx; ... }",
    "tailwindConfig": "module.exports = { theme: { extend: { colors: {...} } } }"
  },
  "estimatedComplexity": "low|medium|high",
  "estimatedTime": "2-4 часа"
}

## Правила

1. Код должен быть РЕАЛЬНЫМ, рабочим TypeScript/TSX — не псевдокод
2. Используй Tailwind CSS v4 utility classes
3. Используй shadcn/ui компоненты где уместно
4. Каждый шаг должен содержать конкретный код, достаточный для копипаста
5. Фазы: Setup → Layout → Sections (по одной на секцию) → Polish → Deploy
6. Для каждой секции landing page создай отдельный шаг с компонентом
7. Адаптируй complexity и time на основе реальной сложности анализа
8. Если VLM данные есть — используй конкретные цвета, размеры, отступы из анализа
`;

  return prompt;
}
