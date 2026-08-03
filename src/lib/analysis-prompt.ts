import type { VlmAnalysisResult } from './vlm-prompt';

/**
 * Извлекает структурированный контент из HTML-страницы.
 * Вместо raw substring(0, 2000) вытаскивает заголовки, CTA, навигацию, герой-текст.
 */
function extractPageStructure(html: string): {
  title: string;
  metaDescription: string;
  headings: string[];
  ctas: string[];
  navigation: string[];
  heroText: string;
  bodyText: string;
} {
  const result = {
    title: '',
    metaDescription: '',
    headings: [] as string[],
    ctas: [] as string[],
    navigation: [] as string[],
    heroText: '',
    bodyText: '',
  };

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) result.title = titleMatch[1].trim();

  // Meta description
  const metaMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (metaMatch) result.metaDescription = metaMatch[1].trim();

  // Headings (h1-h3)
  const headingRegex = /<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi;
  let m: RegExpExecArray | null;
  while ((m = headingRegex.exec(html)) !== null) {
    result.headings.push(m[1].trim());
  }

  // CTAs — кнопки и ссылки с action-текстом
  const ctaPatterns =
    /<(?:button|a)[^>]*>([^<]*(?:купить|buy|зарегистрироваться|sign up|попробовать|try|начать|start|узнать|learn|скачать|download|подключить|get started|заказать|order|связаться|contact)[^<]*)<\/(?:button|a)>/gi;
  while ((m = ctaPatterns.exec(html)) !== null) {
    const text = m[1].trim();
    if (text && !result.ctas.includes(text)) result.ctas.push(text);
  }

  // Navigation links
  const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
  if (navMatch) {
    const linkRegex = /<a[^>]*>([^<]+)<\/a>/gi;
    while ((m = linkRegex.exec(navMatch[1])) !== null) {
      const text = m[1].trim();
      if (text && text.length < 50) result.navigation.push(text);
    }
  }

  // Hero text — первый большой блок текста после body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    const body = bodyMatch[1];
    // Убираем script/style/nav/header/footer
    const cleaned = body
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Берём первые 500 символов очищенного текста как hero
    result.heroText = cleaned.substring(0, 500);

    // Body text — всё что после hero
    result.bodyText = cleaned.substring(500, 3000);
  }

  return result;
}

export const ANALYSIS_SYSTEM_PROMPT = `Ты — UX/UI аналитик. Проанализируй переданные данные по 8 методологиям и верни СТРОГО валидный JSON (без markdown-обёрток). Каждое поле — кратко: 1-3 предложения максимум. Если данных нет — ставь null.

МЕТОДОЛОГИИ:
1. teardown: { title, author, source, type, visualStyle, techStack[], features[], interactions[], inspiration[] }
2. deconstruction: { layers[{name, analysis}], connections }
3. spec: { functionalRequirements[{id,statement}], nonFunctionalRequirements[{id,category,statement}], userStories[{id,asRole,iWant,soThat,acceptanceCriteria[]}] }
4. reverseEngineering: { frontend{stack,confidence,evidence}, animationLib{stack,confidence,evidence}, dataLayer{stack,confidence,evidence}, backend{stack,confidence,evidence}, infra{stack,confidence,evidence} }
5. audit: { problems[{area,severity,description,recommendation}] } — 3-5 проблем
6. heuristicEvaluation: { scores[{heuristic,score(0-4),observations,recommendation}] для 10 эвристик Nielsen, averageScore(float), verdict }

ПРАВИЛА:
- Если данных недостаточно для раздела — верни null или [].
- НЕ придумывай технологии в reverseEngineering без прямых доказательств в тексте.
- НЕ угадывай автора/компанию, если не указано явно.
- Все утверждения должны быть привязаны к цитатам из предоставленных данных.`;

export function buildAnalysisPrompt(
  urls: string[],
  pageContents: Array<{ url: string; title: string; content: string; error?: string }>,
  searchResults: Array<{ url: string; title: string; snippet: string }>,
  vlmResult?: VlmAnalysisResult | null,
  sourceType?: string,
  imageFileName?: string,
  techFingerprints?: string | null,
): string {
  const isBatch = urls.length >= 2;

  let dataSection = 'СОБРАННЫЕ ДАННЫЕ:\n\n';

  if (sourceType) {
    dataSection += `Источник: ${sourceType}${imageFileName ? ` (${imageFileName})` : ''}\n\n`;
  }

  if (vlmResult) {
    dataSection += 'VLM анализ:\n';
    dataSection += JSON.stringify(vlmResult, null, 2);
    dataSection += '\n\n';
  }

  if (pageContents.length > 0) {
    dataSection += 'Содержимое страниц:\n';
    for (const page of pageContents) {
      if (page.error) {
        dataSection += `URL: ${page.url} — ОШИБКА: ${page.error}\n`;
      } else {
        const structure = extractPageStructure(page.content);
        dataSection += `URL: ${page.url}\n`;
        if (structure.title) dataSection += `Заголовок: ${structure.title}\n`;
        if (structure.metaDescription) dataSection += `Описание: ${structure.metaDescription}\n`;
        if (structure.headings.length > 0)
          dataSection += `Заголовки страницы: ${structure.headings.join(' > ')}\n`;
        if (structure.ctas.length > 0) dataSection += `CTA-кнопки: ${structure.ctas.join(', ')}\n`;
        if (structure.navigation.length > 0)
          dataSection += `Навигация: ${structure.navigation.join(', ')}\n`;
        if (structure.heroText) dataSection += `Герой-блок: ${structure.heroText}\n`;
        if (structure.bodyText) dataSection += `Текст страницы (фрагмент): ${structure.bodyText}\n`;
        dataSection += '\n';
      }
    }
    dataSection += '\n';
  }

  if (searchResults.length > 0) {
    dataSection += 'Результаты поиска:\n';
    for (const r of searchResults) {
      dataSection += `- ${r.title}: ${r.snippet}\n`;
    }
    dataSection += '\n';
  }

  if (techFingerprints) {
    dataSection += techFingerprints;
  }

  if (pageContents.length === 0 && searchResults.length === 0 && !vlmResult) {
    dataSection +=
      'ПРЕДУПРЕЖДЕНИЕ: Нет данных от page_reader/web_search. Анализируй только по URL.\n';
  }

  const formatSpec = isBatch
    ? `Формат: { type:"batch", totalUrls:${urls.length}, perUrl:[<single для каждого URL>], patternMining:{groups[{category,patterns[{name,count,percentage,examples,takeaway}]}],summary}, crossCuttingThemes:[] }`
    : `Формат: { type:"${sourceType === 'upload' ? 'upload' : 'single'}", url:"<URL>", teardown:{...}, deconstruction:{...}, spec:{...}, reverseEngineering:{...}, audit:{...}, heuristicEvaluation:{...}, meta:{dataSources:[],confidence:"high|medium|low",caveats:[],missingData:[]} }`;

  return `${ANALYSIS_SYSTEM_PROMPT}\n\n${dataSection}\n${formatSpec}\n\nURL: ${urls.length > 0 ? urls.join(', ') : '(изображение)'}`;
}
