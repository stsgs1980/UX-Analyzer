import type { VlmAnalysisResult } from "./vlm-prompt";

export const ANALYSIS_SYSTEM_PROMPT = `Ты — UX/UI аналитик. Проанализируй переданные данные по 8 методологиям и верни СТРОГО валидный JSON (без markdown-обёрток). Каждое поле — кратко: 1-3 предложения максимум. Если данных нет — ставь null.

МЕТОДОЛОГИИ:
1. teardown: { title, author, source, type, visualStyle, techStack[], features[], interactions[], inspiration[] }
2. deconstruction: { layers[{name, analysis}], connections }
3. spec: { functionalRequirements[{id,statement}], nonFunctionalRequirements[{id,category,statement}], userStories[{id,asRole,iWant,soThat,acceptanceCriteria[]}] }
4. patternMining: null (только для batch>=2 URL)
5. reverseEngineering: { frontend{stack,confidence,evidence}, animationLib{stack,confidence,evidence}, dataLayer{stack,confidence,evidence}, backend{stack,confidence,evidence}, infra{stack,confidence,evidence} }
6. audit: { problems[{area,severity,description,recommendation}] } — 3-5 проблем
7. heuristicEvaluation: { scores[{heuristic,score(0-4),observations,recommendation}] для 10 эвристик Nielsen, averageScore(float), verdict }
8. vlmAnalysis: null (заполняется отдельно)`;

export function buildAnalysisPrompt(
  urls: string[],
  pageContents: Array<{ url: string; title: string; content: string; error?: string }>,
  searchResults: Array<{ url: string; title: string; snippet: string }>,
  vlmResult?: VlmAnalysisResult | null,
  sourceType?: string,
  imageFileName?: string
): string {
  const isBatch = urls.length >= 2;

  let dataSection = "СОБРАННЫЕ ДАННЫЕ:\n\n";

  if (sourceType) {
    dataSection += `Источник: ${sourceType}${imageFileName ? ` (${imageFileName})` : ""}\n\n`;
  }

  if (vlmResult) {
    dataSection += "VLM анализ:\n";
    dataSection += JSON.stringify(vlmResult, null, 2);
    dataSection += "\n\n";
  }

  if (pageContents.length > 0) {
    dataSection += "Содержимое страниц:\n";
    for (const page of pageContents) {
      if (page.error) {
        dataSection += `URL: ${page.url} — ОШИБКА: ${page.error}\n`;
      } else {
        const truncatedContent = page.content.length > 2000
          ? page.content.substring(0, 2000) + "\n...[обрезано]"
          : page.content;
        dataSection += `URL: ${page.url}\nЗаголовок: ${page.title}\n${truncatedContent}\n`;
      }
    }
    dataSection += "\n";
  }

  if (searchResults.length > 0) {
    dataSection += "Результаты поиска:\n";
    for (const r of searchResults) {
      dataSection += `- ${r.title}: ${r.snippet}\n`;
    }
    dataSection += "\n";
  }

  if (pageContents.length === 0 && searchResults.length === 0 && !vlmResult) {
    dataSection += "ПРЕДУПРЕЖДЕНИЕ: Нет данных от page_reader/web_search. Анализируй только по URL.\n";
  }

  const formatSpec = isBatch
    ? `Формат: { type:"batch", totalUrls:${urls.length}, perUrl:[<single для каждого URL>], patternMining:{groups[{category,patterns[{name,count,percentage,examples,takeaway}]}],summary}, crossCuttingThemes:[] }`
    : `Формат: { type:"${sourceType === 'upload' ? 'upload' : 'single'}", url:"<URL>", teardown:{...}, deconstruction:{...}, spec:{...}, patternMining:null, reverseEngineering:{...}, audit:{...}, heuristicEvaluation:{...}, vlmAnalysis:null, meta:{dataSources:[],confidence:"high|medium|low",caveats:[]} }`;

  return `${ANALYSIS_SYSTEM_PROMPT}\n\n${dataSection}\n${formatSpec}\n\nURL: ${urls.length > 0 ? urls.join(", ") : "(изображение)"}`;
}
