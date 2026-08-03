import { describe, it, expect } from "bun:test";
import { buildMarkdownExport } from "@/lib/export-markdown";
import type { AnalysisResult } from "@/store/analysis-store";

const MINIMAL_RESULT: AnalysisResult = {
  type: "single",
  url: "https://example.com",
  teardown: {
    title: "Example Site",
    author: "Test Author",
    source: "https://example.com",
    type: "website",
    visualStyle: "Minimal clean design",
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
  reverseEngineering: {
    frontend: { stack: "React/Next.js", confidence: "high", evidence: "SSR patterns" },
    backend: { stack: "Unknown", confidence: "low", evidence: "No visible API calls" },
  },
  audit: {
    problems: [
      { area: "Navigation", severity: "minor", description: "Mobile menu unclear", recommendation: "Add hamburger icon label" },
    ],
  },
  heuristicEvaluation: {
    scores: [
      { heuristic: "Видимость статуса системы", score: 3, observations: "Loading states present", recommendation: "None" },
    ],
    averageScore: 3.5,
    verdict: "Good overall usability",
  },
  meta: {
    dataSources: ["page_reader"],
    confidence: "medium",
  },
  vlmAnalysis: {
    colorPalette: {
      primary: ["#1a73e8"],
      secondary: ["#5f6368"],
      accent: ["#ea4335"],
      background: ["#ffffff"],
      text: ["#202124"],
      dominantColors: [
        { hex: "#ffffff", name: "White", usage: "Background", percentage: 60 },
        { hex: "#1a73e8", name: "Blue", usage: "Primary buttons", percentage: 15 },
      ],
    },
    typography: {
      headings: { style: "sans-serif", weight: "bold", characteristics: "Clean modern" },
      body: { style: "sans-serif", weight: "regular", characteristics: "Readable" },
      sizeScale: ["12px", "14px", "16px", "20px", "24px"],
    },
    layout: {
      gridType: "12-col",
      spacing: "8px base",
      alignment: "left",
      density: "normal",
      maxContentWidth: "1200px",
    },
    components: [
      { type: "button", characteristics: "Rounded", states: ["default", "hover"], borderRadius: "medium", shadows: "none" },
    ],
    visualEffects: [],
    moodAndTone: { keywords: ["professional"], description: "Clean interface" },
    accessibilityNotes: ["Missing alt text on decorative images"],
    uiPatterns: [{ pattern: "Hamburger Menu", description: "Collapsible navigation" }],
  },
  designMd: "# Design System\n\nAuto-generated.",
  rscPayload: {
    isNextJs: true,
    serverComponents: ["app/layout.tsx", "app/page.tsx"],
    clientComponents: ["components/Counter.tsx"],
    routeTree: [
      { segment: "/", page: "app/page.tsx", layout: "app/layout.tsx", loading: "", error: "" },
    ],
    summary: "Next.js App Router detected with RSC",
    metadata: { title: "Example", description: "Test" },
    fontPreloads: ["Inter"],
    scriptPreloads: ["app/page.js"],
  },
};

describe("buildMarkdownExport", () => {
  it("generates a valid markdown document with header", () => {
    const md = buildMarkdownExport(MINIMAL_RESULT);
    expect(md.startsWith("# Example Site")).toBe(true);
    expect(md).toContain("UX-Analyzer");
    expect(md).toContain("https://example.com");
    expect(md).toContain("Test Author");
  });

  it("includes all 9 sections", () => {
    const md = buildMarkdownExport(MINIMAL_RESULT, MINIMAL_RESULT.designMd);
    expect(md).toContain("## 1. Обзор продукта");
    expect(md).toContain("## 2. Деконструкция");
    expect(md).toContain("## 3. Спецификация");
    expect(md).toContain("## 4. Обратная инженерия");
    expect(md).toContain("## 5. Аудит UX");
    expect(md).toContain("## 6. Эвристическая оценка");
    expect(md).toContain("## 7. Визуальный анализ");
    expect(md).toContain("## 8. Design System");
    expect(md).toContain("## 9. RSC Payload");
  });

  it("renders teardown with tech stack and features", () => {
    const md = buildMarkdownExport(MINIMAL_RESULT);
    expect(md).toContain("Next.js");
    expect(md).toContain("Tailwind CSS");
    expect(md).toContain("Responsive layout");
    expect(md).toContain("Hover effects");
  });

  it("renders spec with tables and user stories", () => {
    const md = buildMarkdownExport(MINIMAL_RESULT);
    expect(md).toContain("| FR-01");
    expect(md).toContain("Как *visitor*");
    expect(md).toContain("Hero section visible");
  });

  it("renders reverse engineering table", () => {
    const md = buildMarkdownExport(MINIMAL_RESULT);
    expect(md).toContain("React/Next.js");
    expect(md).toContain("high");
    expect(md).toContain("SSR patterns");
  });

  it("renders audit problems table", () => {
    const md = buildMarkdownExport(MINIMAL_RESULT);
    expect(md).toContain("Navigation");
    expect(md).toContain("**minor**");
    expect(md).toContain("Add hamburger icon label");
  });

  it("renders heuristic scores with average and verdict", () => {
    const md = buildMarkdownExport(MINIMAL_RESULT);
    expect(md).toContain("3/4");
    expect(md).toContain("3.5/4");
    expect(md).toContain("Good overall usability");
  });

  it("renders VLM color palette as table", () => {
    const md = buildMarkdownExport(MINIMAL_RESULT);
    expect(md).toContain("#ffffff");
    expect(md).toContain("#1a73e8");
    expect(md).toContain("Background");
    expect(md).toContain("60%");
  });

  it("includes designMd content when provided", () => {
    const md = buildMarkdownExport(MINIMAL_RESULT, "# Custom Design Doc");
    expect(md).toContain("Custom Design Doc");
  });

  it("includes RSC route tree table", () => {
    const md = buildMarkdownExport(MINIMAL_RESULT);
    expect(md).toContain("app/layout.tsx");
    expect(md).toContain("app/page.tsx");
    expect(md).toContain("Server Components");
    expect(md).toContain("Client Components");
  });

  it("ends with UX-Analyzer footer", () => {
    const md = buildMarkdownExport(MINIMAL_RESULT);
    expect(md).toContain("Generated by UX-Analyzer");
  });

  it("handles minimal/empty result gracefully", () => {
    const md = buildMarkdownExport({});
    expect(md).toContain("# UX Analysis Report");
    expect(md).toContain("Generated by UX-Analyzer");
  });

  it("skips sections when data is missing", () => {
    const md = buildMarkdownExport({ teardown: { title: "Only Teardown" } });
    expect(md).toContain("# Only Teardown");
    expect(md).not.toContain("## 2. Деконструкция");
    expect(md).not.toContain("## 3. Спецификация");
  });
});
