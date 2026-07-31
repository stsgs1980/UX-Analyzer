import { test, expect } from "@playwright/test";

test.describe("UX Analyzer E2E", () => {
  test("homepage loads with URL input", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('input[placeholder*="URL"]')
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("Запустить анализ")')
    ).toBeVisible();
  });

  test("shows error for invalid URL", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[placeholder*="URL"]');
    await input.fill("not-a-valid-url");
    const button = page.locator('button:has-text("Запустить анализ")');
    await button.click();
    await expect(page.locator('text="Ошибка анализа"')).toBeVisible({
      timeout: 10_000,
    });
  });

  test("performs analysis and shows results", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[placeholder*="URL"]');
    await input.fill("https://example.com");
    const button = page.locator('button:has-text("Запустить анализ")');
    await button.click();
    await expect(
      page.locator('text=/\\d+%/')
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('[role="tab"]')
    ).toBeVisible({ timeout: 60_000 });
  });

  test("result tabs are clickable", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[placeholder*="URL"]');
    await input.fill("https://example.com");
    const button = page.locator('button:has-text("Запустить анализ")');
    await button.click();
    const tabs = page.locator('[role="tab"]');
    await expect(tabs.first()).toBeVisible({ timeout: 60_000 });
    const tabCount = await tabs.count();
    for (let i = 0; i < Math.min(tabCount, 5); i++) {
      await tabs.nth(i).click();
      await expect(tabs.nth(i)).toHaveAttribute("aria-selected", "true");
    }
  });
});
