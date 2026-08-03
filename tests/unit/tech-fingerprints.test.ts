import { describe, it, expect } from "vitest";
import {
  extractTechFingerprints,
  detectLibraries,
  formatFingerprintsForPrompt,
} from "@/lib/tech-fingerprints";

describe("extractTechFingerprints", () => {
  it("extracts scripts, stylesheets, meta tags from HTML", () => {
    const html = `
      <head>
        <meta name="generator" content="Next.js">
        <link rel="stylesheet" href="/style.css">
        <script src="/app.js"></script>
      </head>
      <body class="flex p-4 bg-white">
        <div data-testid="root"></div>
      </body>
    `;
    const fp = extractTechFingerprints(html);
    expect(fp.scripts).toContain("/app.js");
    expect(fp.stylesheets).toContain("/style.css");
    expect(fp.metaTags["generator"]).toBe("Next.js");
    expect(fp.classPatterns).toContain("flexbox utility");
    expect(fp.dataAttrs).toContain("data-testid");
  });

  it("returns empty arrays for empty HTML", () => {
    const fp = extractTechFingerprints("");
    expect(fp.scripts).toEqual([]);
    expect(fp.stylesheets).toEqual([]);
    expect(fp.metaTags).toEqual({});
    expect(fp.inlineData).toEqual([]);
  });

  it("handles double-quoted attributes", () => {
    const html = `<script src="https://cdn.example.com/lib.js"></script>`;
    const fp = extractTechFingerprints(html);
    expect(fp.scripts).toContain("https://cdn.example.com/lib.js");
  });

  it("handles single-quoted attributes", () => {
    const html = `<script src='https://cdn.example.com/lib.js'></script>`;
    const fp = extractTechFingerprints(html);
    expect(fp.scripts).toContain("https://cdn.example.com/lib.js");
  });

  it("captures __NEXT_DATA__ inline data", () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>`;
    const fp = extractTechFingerprints(html);
    expect(fp.inlineData.length).toBe(1);
    expect(fp.inlineData[0]).toContain("__NEXT_DATA__");
  });

  it("captures __NUXT__ inline data", () => {
    const html = `<script>window.__NUXT__ = {state: true}</script>`;
    const fp = extractTechFingerprints(html);
    expect(fp.inlineData.length).toBe(1);
    expect(fp.inlineData[0]).toContain("__NUXT__");
  });

  it("detects Tailwind-like utility classes", () => {
    const html = `<body class="flex p-4 m-2 text-white bg-blue-500 rounded shadow-lg"></body>`;
    const fp = extractTechFingerprints(html);
    expect(fp.classPatterns).toContain("Tailwind-like utility classes");
  });

  it("detects Bootstrap-like component classes", () => {
    const html = `<body class="container btn navbar card"></body>`;
    const fp = extractTechFingerprints(html);
    expect(fp.classPatterns).toContain("Bootstrap-like BEM/component classes");
  });

  it("extracts unique data attributes", () => {
    const html = `<div data-id="1" data-name="test" data-id="1"></div>`;
    const fp = extractTechFingerprints(html);
    expect(fp.dataAttrs).toContain("data-id");
    expect(fp.dataAttrs).toContain("data-name");
    expect(fp.dataAttrs.filter((a) => a === "data-id")).toHaveLength(1);
  });

  it("truncates head snippet to 1500 chars", () => {
    const longHead = "x".repeat(2000);
    const html = `<head>${longHead}</head>`;
    const fp = extractTechFingerprints(html);
    expect(fp.headSnippet.length).toBeLessThanOrEqual(1500);
  });

  it("handles reversed meta tag attribute order", () => {
    const html = `<meta content="Next.js" name="generator">`;
    const fp = extractTechFingerprints(html);
    expect(fp.metaTags["generator"]).toBe("Next.js");
  });
});

describe("detectLibraries", () => {
  it("detects React from __NEXT_DATA__", () => {
    const fp = extractTechFingerprints(
      '<script id="__NEXT_DATA__">{"props":{}}</script>'
    );
    const detected = detectLibraries(fp);
    expect(detected.some((d) => d.name === "React")).toBe(true);
  });

  it("detects Next.js from _next scripts", () => {
    const fp = extractTechFingerprints(
      '<script src="/_next/static/chunk.js"></script>'
    );
    const detected = detectLibraries(fp);
    expect(detected.some((d) => d.name === "Next.js")).toBe(true);
  });

  it("detects Tailwind from stylesheet", () => {
    const fp = extractTechFingerprints(
      '<link rel="stylesheet" href="/tailwind.css">'
    );
    const detected = detectLibraries(fp);
    expect(detected.some((d) => d.name === "Tailwind CSS")).toBe(true);
  });

  it("returns empty array when nothing detected", () => {
    const fp = extractTechFingerprints("<html><body>Hello</body></html>");
    const detected = detectLibraries(fp);
    expect(detected).toEqual([]);
  });

  it("detects multiple libraries simultaneously", () => {
    const html = `
      <script src="/_next/static/chunk.js"></script>
      <link rel="stylesheet" href="/tailwind.css">
      <script src="https://cdn.jsdelivr.net/npm/framer-motion"></script>
    `;
    const fp = extractTechFingerprints(html);
    const detected = detectLibraries(fp);
    const names = detected.map((d) => d.name);
    expect(names).toContain("Next.js");
    expect(names).toContain("Tailwind CSS");
    expect(names).toContain("Framer Motion");
  });
});

describe("formatFingerprintsForPrompt", () => {
  it("formats populated fingerprints into readable string", () => {
    const fp = extractTechFingerprints(`
      <head>
        <meta name="generator" content="Next.js">
        <link rel="stylesheet" href="/style.css">
        <script src="/app.js"></script>
      </head>
      <body class="flex p-4"></body>
    `);
    const result = formatFingerprintsForPrompt(fp);
    expect(result).toContain("ТЕХНИЧЕСКИЕ ДАННЫЕ");
    expect(result).toContain("/app.js");
    expect(result).toContain("/style.css");
  });

  it("returns minimal header for empty fingerprints", () => {
    const fp = extractTechFingerprints("");
    const result = formatFingerprintsForPrompt(fp);
    expect(result).toContain("ТЕХНИЧЕСКИЕ ДАННЫЕ");
  });
});
