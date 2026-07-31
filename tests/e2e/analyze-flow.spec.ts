import { test, expect } from "@playwright/test";

// ── Mock data ──

const MOCK_PROGRESS_STEPS = [
  { type: "progress", step: "init", message: "Инициализирую AI-движок...", progress: 0.02, analysisId: "mock-id-1" },
  { type: "progress", step: "fetching", message: "Читаю страницу и ищу контекст...", progress: 0.14, analysisId: "mock-id-1" },
  { type: "progress", step: "fetching", message: "Получено 1 страниц, 2 результатов поиска", progress: 0.32, analysisId: "mock-id-1" },
  { type: "progress", step: "vlm", message: "Распознаю визуальный дизайн...", progress: 0.38, analysisId: "mock-id-1" },
  { type: "progress", step: "preparing", message: "Компоную данные для AI-анализа...", progress: 0.52, analysisId: "mock-id-1" },
  { type: "progress", step: "analyzing", message: "AI обрабатывает: Анализ визуального стиля...", progress: 0.55, analysisId: "mock-id-1" },
  { type: "progress", step: "parsing", message: "Разбираю структуру результатов...", progress: 0.82, analysisId: "mock-id-1" },
  { type: "progress", step: "saving", message: "Сохраняю результаты в базу...", progress: 0.93, analysisId: "mock-id-1" },
  { type: "progress", step: "done", message: "Анализ завершён!", progress: 1, analysisId: "mock-id-1" },
];

const MOCK_RESULT = {
  type: "single",
  url: "https://example.com",
  sourceType: "url",
  meta: { dataSources: ["page_reader"], confidence: "medium" },
  teardown: {
    title: "Example",
    author: null,
    source: "https://example.com",
    type: "website",
    visualStyle: "Minimal clean design with neutral colors",
    techStack: ["Next.js", "Tailwind CSS"],
    features: ["Responsive layout", "SEO optimized"],
    interactions: ["Hover effects", "Smooth scroll"],
    inspiration: ["Clean typography", "Generous whitespace"],
  },
  deconstruction: {
    layers: [
      { name: "Навигация", analysis: "Header with logo and main menu" },
      { name: "Герой", analysis: "Central call-to-action area" },
    ],
    connections: "Clear flow from hero to content sections",
  },
  spec: {
    functionalRequirements: [
      { id: "FR-01", statement: "System shall display a landing page" },
      { id: "FR-02", statement: "System shall support responsive layout" },
    ],
    nonFunctionalRequirements: [
      { id: "NFR-01", category: "Performance", statement: "Page load < 3s" },
    ],
    userStories: [
      {
        id: "US-01",
        asRole: "visitor",
        iWant: "see the main value proposition",
        soThat: "I understand the product quickly",
        acceptanceCriteria: ["Hero section visible above the fold"],
      },
    ],
  },
  patternMining: null,
  reverseEngineering: {
    frontend: { stack: "React/Next.js", confidence: "high", evidence: "Server-side rendering patterns" },
    animationLib: { stack: "Framer Motion", confidence: "medium", evidence: "Transition animations" },
    dataLayer: { stack: "Zustand", confidence: "low", evidence: "State management pattern" },
    backend: { stack: "Unknown", confidence: "low", evidence: "No visible API calls" },
    infra: { stack: "Vercel", confidence: "medium", evidence: "Deployment pattern" },
  },
  audit: {
    problems: [
      { area: "Navigation", severity: "minor", description: "Mobile menu could be clearer", recommendation: "Add hamburger icon label" },
    ],
  },
  heuristicEvaluation: {
    scores: [
      { heuristic: "Видимость статуса системы", score: 3, observations: "Loading states present", recommendation: "None" },
      { heuristic: "Соответствие стандартам", score: 4, observations: "Clean familiar patterns", recommendation: "None" },
    ],
    averageScore: 3.5,
    verdict: "Good overall usability with minor improvements needed",
  },
};

/** Build a mock SSE response body for /api/analyze */
function mockSSE(
  steps: Array<Record<string, unknown>>,
  finalEvent: { type: string; [key: string]: unknown }
): string {
  const events = steps.map((s) => `data: ${JSON.stringify(s)}\n\n`).join("");
  return events + `data: ${JSON.stringify(finalEvent)}\n\n`;
}

// ── Tests ──

test.describe("UX Analyzer E2E", () => {
  test("homepage loads with URL input and methodology list", async ({ page }) => {
    await page.goto("/");

    // URL input visible
    await expect(page.locator('input[placeholder*="URL"]')).toBeVisible();

    // Analyze button visible
    await expect(page.locator('button:has-text("Запустить анализ")')).toBeVisible();

    // Methodology list should show 8 items
    await expect(page.locator('text="01"').first()).toBeVisible();
    await expect(page.locator('text="08"').first()).toBeVisible();
  });

  test("shows error for invalid URL", async ({ page }) => {
    // Mock the analyze API to return 400 for invalid URL
    await page.route("**/api/analyze", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "URL недоступен или запрещён" }),
      });
    });

    // Also mock history to avoid 500
    await page.route("**/api/analyses**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await page.goto("/");
    const input = page.locator('input[placeholder*="URL"]');
    await input.fill("not-a-valid-url");
    await input.press("Enter");

    // addUrl() prepends https:// — badge shows the full URL
    await expect(page.locator('text="https://not-a-valid-url"').first()).toBeVisible({
      timeout: 5_000,
    });

    // Click analyze
    await page.locator('button:has-text("Запустить анализ")').click();

    // Error should appear
    await expect(page.locator('text="Ошибка анализа"')).toBeVisible({
      timeout: 5_000,
    });
  });

  test("analysis flow: progress → result with tabs", async ({ page }) => {
    // Mock SSE analyze endpoint
    await page.route("**/api/analyze", async (route) => {
      const sseBody = mockSSE(MOCK_PROGRESS_STEPS, {
        type: "result",
        data: MOCK_RESULT,
        analysisId: "mock-id-1",
      });
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: sseBody,
      });
    });

    // Mock history and analyses endpoints
    await page.route("**/api/analyses**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await page.goto("/");

    // Add URL
    const input = page.locator('input[placeholder*="URL"]');
    await input.fill("https://example.com");
    await input.press("Enter");

    // URL badge visible
    await expect(page.locator('text="https://example.com"').first()).toBeVisible({
      timeout: 5_000,
    });

    // Click analyze
    await page.locator('button:has-text("Запустить анализ")').click();

    // Progress percentage should appear
    await expect(page.locator('text=/\\d+%/').first()).toBeVisible({ timeout: 5_000 });

    // Progress completes → result tabs should appear
    const tabs = page.locator('[role="tab"]');
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

    // Verify multiple tabs are present
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(4);

    // Click first 3 tabs and verify aria-selected
    for (let i = 0; i < Math.min(tabCount, 3); i++) {
      await tabs.nth(i).click();
      await expect(tabs.nth(i)).toHaveAttribute("aria-selected", "true", {
        timeout: 3_000,
      });
    }
  });

  test("error during analysis shows error message", async ({ page }) => {
    // Mock SSE that sends progress then error.
    // Use a real response body stream to ensure events arrive in separate chunks.
    await page.route("**/api/analyze", async (route) => {
      const progressChunk = MOCK_PROGRESS_STEPS.slice(0, 3)
        .map((s) => `data: ${JSON.stringify(s)}\n\n`)
        .join("");
      const errorChunk = `data: ${JSON.stringify({ type: "error", message: "Ошибка инициализации AI. Попробуйте позже." })}\n\n`;

      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: progressChunk + errorChunk,
      });
    });

    await page.route("**/api/analyses**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await page.goto("/");
    const input = page.locator('input[placeholder*="URL"]');
    await input.fill("https://example.com");
    await input.press("Enter");
    await expect(page.locator('text="https://example.com"').first()).toBeVisible({
      timeout: 5_000,
    });

    await page.locator('button:has-text("Запустить анализ")').click();

    // Error appears (progress events processed in same tick → only error state renders)
    await expect(page.locator('text="Ошибка анализа"')).toBeVisible({ timeout: 10_000 });
  });
});
