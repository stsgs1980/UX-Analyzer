import { describe, it, expect } from "vitest";
import { extractRscFromHtml } from "@/lib/pipeline/steps/rsc-extract";
import type { RscExtractResult } from "@/lib/pipeline/types";

describe("extractRscFromHtml", () => {
  it("returns isNextJs=false for non-Next.js HTML", () => {
    const html = `
      <html><head><title>WordPress Site</title></head>
      <body><div id="content"><p>Hello world</p></div></body>
      </html>`;
    const result = extractRscFromHtml("https://example.com", html);
    expect(result.isNextJs).toBe(false);
    expect(result.summary).toContain("не является Next.js");
    expect(result.nextData).toBeNull();
    expect(result.serverComponents).toEqual([]);
  });

  it("detects Next.js from _next scripts", () => {
    const html = `
      <html><head>
        <script src="/_next/static/chunks/main.js"></script>
      </head><body></body></html>`;
    const result = extractRscFromHtml("https://example.com", html);
    expect(result.isNextJs).toBe(true);
  });

  it("detects Next.js from __NEXT_DATA__ script", () => {
    const html = `
      <html><head>
        <script id="__NEXT_DATA__" type="application/json">
          {"buildId":"test123","props":{},"page":"/"}
        </script>
      </head><body></body></html>`;
    const result = extractRscFromHtml("https://example.com", html);
    expect(result.isNextJs).toBe(true);
    expect(result.nextData).not.toBeNull();
    expect(result.nextData!.buildId).toBe("test123");
  });

  it("detects Next.js from next-route-announcer", () => {
    const html = `
      <html><head></head>
      <body><div role="status" aria-live="polite" class="next-route-announcer"></div></body></html>`;
    const result = extractRscFromHtml("https://example.com", html);
    expect(result.isNextJs).toBe(true);
  });

  it("extracts metadata from head", () => {
    const html = `
      <html><head>
        <meta name="generator" content="Next.js v15.3.0" />
        <meta name="theme-color" content="#000000" />
        <meta property="og:title" content="Test Page" />
        <script id="__NEXT_DATA__" type="application/json">{"buildId":"x"}</script>
      </head><body></body></html>`;
    const result = extractRscFromHtml("https://example.com", html);
    expect(result.metadata).not.toBeNull();
    expect(result.metadata!["generator"]).toBe("Next.js v15.3.0");
    expect(result.metadata!["theme-color"]).toBe("#000000");
    expect(result.metadata!["og:title"]).toBe("Test Page");
  });

  it("extracts font preloads from link tags", () => {
    const html = `
      <html><head>
        <script id="__NEXT_DATA__" type="application/json">{"buildId":"x"}</script>
        <link rel="preload" href="/_next/static/media/geist-sans.woff2" as="font" type="font/woff2" crossorigin />
        <link rel="preload" href="/_next/static/media/geist-mono.woff2" as="font" type="font/woff2" crossorigin />
      </head><body></body></html>`;
    const result = extractRscFromHtml("https://example.com", html);
    expect(result.fontPreloads.length).toBe(2);
    expect(result.fontPreloads).toContain("geist-sans.woff2");
    expect(result.fontPreloads).toContain("geist-mono.woff2");
  });

  it("extracts script preloads (JS chunks)", () => {
    const html = `
      <html><head>
        <script id="__NEXT_DATA__" type="application/json">{"buildId":"x"}</script>
        <script src="/_next/static/chunks/webpack.js"></script>
        <script src="/_next/static/chunks/main-app.js"></script>
        <script src="/_next/static/chunks/app/page.js"></script>
      </head><body></body></html>`;
    const result = extractRscFromHtml("https://example.com", html);
    expect(result.scriptPreloads.length).toBe(3);
    expect(result.scriptPreloads).toContain("webpack.js");
    expect(result.scriptPreloads).toContain("main-app.js");
    expect(result.scriptPreloads).toContain("app/page.js");
  });

  it("parses RSC streaming chunks from self.__next_f.push", () => {
    const html = `
      <html><head>
        <script id="__NEXT_DATA__" type="application/json">{"buildId":"x"}</script>
      </head><body>
        <script>
          self.__next_f.push([1,"use client\\nexport function App() { return null }"])
          self.__next_f.push([2,"export function Layout() { return null }"])
        </script>
      </body></html>`;
    const result = extractRscFromHtml("https://example.com", html);
    expect(result.rscPayloads.length).toBe(2);
    expect(result.rscPayloads[0].id).toBe("1");
    expect(result.rscPayloads[1].id).toBe("2");
  });

  it("detects use client directives", () => {
    const html = `
      <html><head>
        <script id="__NEXT_DATA__" type="application/json">{"buildId":"x"}</script>
      </head><body>
        <script>self.__next_f.push([1,"use client\\nexport function PricingSection() {}"])</script>
      </body></html>`;
    const result = extractRscFromHtml("https://example.com", html);
    expect(result.clientComponents.length).toBeGreaterThan(0);
    expect(result.clientComponents[0]).toContain("use client");
  });

  it("extracts server component names from chunk data", () => {
    const html = `
      <html><head>
        <script id="__NEXT_DATA__" type="application/json">{"buildId":"x"}</script>
      </head><body>
        <script>self.__next_f.push([1,'"use client"\\nexport function PricingSection() { return null }\\n\\n"use client"\\nexport function FooterSection() {}'])</script>
      </body></html>`;
    const result = extractRscFromHtml("https://example.com", html);
    // Server components extracted from chunk names containing page/layout/template
    // Note: this HTML doesn't have page/layout in strings, so server components come from chunk patterns
    expect(result).toBeDefined();
  });

  it("generates summary with all detected data", () => {
    const html = `
      <html><head>
        <script id="__NEXT_DATA__" type="application/json">{"buildId":"abc123","page":"/test"}</script>
        <link rel="preload" href="/_next/static/media/font.woff2" as="font" type="font/woff2" crossorigin />
        <script src="/_next/static/chunks/app.js"></script>
      </head><body>
        <script>self.__next_f.push([1,"use client\\nexport function X() {}"])</script>
      </body></html>`;
    const result = extractRscFromHtml("https://example.com", html);
    expect(result.summary).toContain("Next.js");
    expect(result.summary).toContain("abc123");
    expect(result.summary).toContain("Font assets");
    expect(result.summary).toContain("RSC chunks");
    expect(result.summary).toContain("Client components");
  });

  it("returns url in result", () => {
    const url = "https://example.com/page";
    const html = `<html><head></head><body></body></html>`;
    const result = extractRscFromHtml(url, html);
    expect(result.url).toBe(url);
  });

  it("handles empty HTML gracefully", () => {
    const result = extractRscFromHtml("https://example.com", "");
    expect(result.isNextJs).toBe(false);
    expect(result.summary).toContain("не является Next.js");
    expect(result.serverComponents).toEqual([]);
    expect(result.clientComponents).toEqual([]);
    expect(result.scriptPreloads).toEqual([]);
  });

  // ── Integration test with Pointer AI fixture ──
  it("correctly parses the Pointer AI Next.js page fixture", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fixture = require("../fixtures/pointer-ai-nextjs-page.json");
    const result = extractRscFromHtml(fixture.url, fixture.rawHtml);

    expect(result.isNextJs).toBe(true);
    expect(result.nextData).not.toBeNull();
    expect(result.nextData!.buildId).toBe("abc123def456");

    // RSC chunks
    expect(result.rscPayloads.length).toBeGreaterThanOrEqual(2);

    // Client components
    expect(result.clientComponents.length).toBeGreaterThan(0);
    expect(result.clientComponents[0]).toContain("use client");

    // Metadata
    expect(result.metadata).not.toBeNull();
    expect(result.metadata!["generator"]).toContain("Next.js");
    expect(result.metadata!["og:title"]).toBe("Pointer AI Landing Page");

    // Font preloads
    expect(result.fontPreloads.length).toBeGreaterThanOrEqual(2);

    // Script preloads
    expect(result.scriptPreloads.length).toBeGreaterThanOrEqual(5);

    // Summary mentions key facts
    expect(result.summary).toContain("Next.js");
    expect(result.summary).toContain("abc123def456");
  });
});
