import { describe, it, expect } from "vitest";
import { buildAnalysisPrompt, ANALYSIS_SYSTEM_PROMPT } from "@/lib/analysis-prompt";

describe("buildAnalysisPrompt", () => {
  const basePages = [{ url: "https://example.com", title: "Example", content: "Hello world" }];
  const baseSearch = [{ url: "https://search.com", title: "Search", snippet: "A result" }];

  it("includes ANALYSIS_SYSTEM_PROMPT at the start", () => {
    const result = buildAnalysisPrompt(["https://example.com"], basePages, baseSearch);
    expect(result.startsWith(ANALYSIS_SYSTEM_PROMPT)).toBe(true);
  });

  it("uses single format for 1 URL", () => {
    const result = buildAnalysisPrompt(["https://example.com"], basePages, baseSearch);
    expect(result).toContain('type:"single"');
    expect(result).toContain("patternMining:null");
  });

  it("uses batch format for 2+ URLs", () => {
    const urls = ["https://a.com", "https://b.com"];
    const result = buildAnalysisPrompt(urls, [], []);
    expect(result).toContain('type:"batch"');
    expect(result).toContain("patternMining");
    expect(result).toContain("crossCuttingThemes");
  });

  it("includes VLM result when provided", () => {
    const vlm = { colorPalette: { primary: ["#fff"] } };
    const result = buildAnalysisPrompt(["https://example.com"], basePages, baseSearch, vlm);
    expect(result).toContain("VLM анализ");
    expect(result).toContain("#fff");
  });

  it("excludes VLM section when not provided", () => {
    const result = buildAnalysisPrompt(["https://example.com"], basePages, baseSearch);
    expect(result).not.toContain("VLM анализ");
  });

  it("includes tech fingerprints when provided", () => {
    const fp = "Обнаруженные библиотеки:\n- React";
    const result = buildAnalysisPrompt(["https://example.com"], basePages, baseSearch, null, "url", undefined, fp);
    expect(result).toContain("React");
  });

  it("shows error for page with fetch error", () => {
    const pages = [{ url: "https://fail.com", title: "Fail", content: "", error: "timeout" }];
    const result = buildAnalysisPrompt(["https://fail.com"], pages, []);
    expect(result).toContain("ОШИБКА: timeout");
  });

  it("shows warning when no data available", () => {
    const result = buildAnalysisPrompt(["https://example.com"], [], []);
    expect(result).toContain("ПРЕДУПРЕЖДЕНИЕ");
  });

  it("includes sourceType when provided", () => {
    const result = buildAnalysisPrompt(["https://example.com"], basePages, baseSearch, null, "upload", "design.png");
    expect(result).toContain("upload");
    expect(result).toContain("design.png");
  });

  it("truncates long page content to 2000 chars", () => {
    const longContent = "x".repeat(3000);
    const pages = [{ url: "https://example.com", title: "Long", content: longContent }];
    const result = buildAnalysisPrompt(["https://example.com"], pages, []);
    expect(result).toContain("...[обрезано]");
    expect(result).not.toContain(longContent);
  });
});
