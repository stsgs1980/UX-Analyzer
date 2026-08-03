import { test, expect } from "@playwright/test";

/** Wait for the exposed store and add URL */
async function addUrlViaStore(page: import("@playwright/test").Page, url: string) {
  await page.waitForFunction(() => !!(window as any).__store, { timeout: 5_000 });
  await page.evaluate((u) => {
    (window as any).__store.getState().addUrl(u);
  }, url);
}

/** Check if "Запустить анализ" is enabled */
async function waitForAnalyzeReady(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.includes("Запустить анализ"),
    );
    return btn && !btn.disabled;
  }, { timeout: 5_000 });
}

// ── Mock data ──

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

const MOCK_ANALYSIS_ID = "mock-e2e-id";

/**
 * Mock the polling-based analysis flow:
 * POST /api/analyze → { analysisId, status: "running" }
 * GET  /api/analyze/progress/:id → progress → completed
 */
function mockPollingAnalysis(page: import("@playwright/test").Page, options?: { error?: string }) {
  let pollCount = 0;

  // Mock POST /api/analyze — returns JSON immediately
  page.route("**/api/analyze", async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ analysisId: MOCK_ANALYSIS_ID, status: "running" }),
      });
      return;
    }
    await route.continue();
  });

  // Mock GET /api/analyze/progress/:id — returns progress then completed
  page.route("**/api/analyze/progress/**", async (route) => {
    pollCount++;

    if (options?.error && pollCount >= 2) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          step: "error",
          message: options.error,
          progress: 0.3,
          status: "error",
          error: options.error,
        }),
      });
      return;
    }

    if (pollCount >= 3) {
      // Completed
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          step: "done",
          message: "Анализ завершён!",
          progress: 1,
          status: "completed",
          result: MOCK_RESULT,
        }),
      });
      return;
    }

    // In-progress response
    const progressSteps = [
      { step: "init", message: "Инициализирую AI-движок...", progress: 0.02 },
      { step: "fetching", message: "Читаю страницу и ищу контекст...", progress: 0.32 },
    ];
    const step = progressSteps[Math.min(pollCount - 1, progressSteps.length - 1)];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...step,
        status: "running",
      }),
    });
  });
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
    await addUrlViaStore(page, "not-a-valid-url");
    await waitForAnalyzeReady(page);

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
    // Mock the polling-based analysis flow
    mockPollingAnalysis(page);

    // Mock history and analyses endpoints
    await page.route("**/api/analyses**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await page.goto("/");

    // Add URL using exposed store
    await addUrlViaStore(page, "https://example.com");
    await waitForAnalyzeReady(page);

    // URL badge visible
    await expect(page.locator('text="https://example.com"').first()).toBeVisible({
      timeout: 5_000,
    });

    // Click analyze
    await page.locator('button:has-text("Запустить анализ")').first().click();

    // Result section should appear (polling delivers completed state)
    await expect(page.locator('text="Результат анализа"')).toBeVisible({ timeout: 15_000 });

    // Verify cards inside the result section
    const resultSection = page.locator('text="Результат анализа"').locator("..").locator("..").locator("..");
    const cards = resultSection.locator(".bento-card");
    await expect(cards.first()).toBeVisible({ timeout: 5_000 });
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(4);
  });

  test("error during analysis shows error message", async ({ page }) => {
    // Mock the polling flow that results in an error
    mockPollingAnalysis(page, { error: "Ошибка инициализации AI. Попробуйте позже." });

    await page.route("**/api/analyses**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await page.goto("/");
    await addUrlViaStore(page, "https://example.com");
    await waitForAnalyzeReady(page);
    await expect(page.locator('text="https://example.com"').first()).toBeVisible({
      timeout: 5_000,
    });

    await page.locator('button:has-text("Запустить анализ")').click();

    // Error appears after polling returns error status
    await expect(page.locator('text="Ошибка анализа"')).toBeVisible({ timeout: 10_000 });
  });
});
