/**
 * HTML parsing helpers for RSC payload extraction.
 * Pure functions — no side effects, no pipeline dependency.
 */

import type { RscExtractResult } from "../types";

// ── 1. Detect Next.js ──

export function detectNextJs(rawHtml: string): boolean {
  return (
    rawHtml.includes("__NEXT_DATA__") ||
    rawHtml.includes("_next/") ||
    rawHtml.includes("next-route-announcer") ||
    /<script[^>]*src=["'][^"']*_next\/static/.test(rawHtml)
  );
}

// ── 2. Extract __NEXT_DATA__ ──

export function parseNextData(rawHtml: string): Record<string, unknown> | null {
  const nextDataMatch = rawHtml.match(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!nextDataMatch) return null;

  const rawJson = nextDataMatch[1].trim();

  // Try direct parse first
  try {
    return JSON.parse(rawJson);
  } catch {
    // Fallback: find the balanced JSON object within the captured text
    // (some pages append non-JSON content after the closing brace)
    try {
      let depth = 0;
      let end = -1;
      for (let i = 0; i < rawJson.length; i++) {
        if (rawJson[i] === "{" || rawJson[i] === "[") depth++;
        if (rawJson[i] === "}" || rawJson[i] === "]") depth--;
        if (depth === 0 && i > 0) {
          end = i + 1;
          break;
        }
      }
      if (end > 0) {
        return JSON.parse(rawJson.substring(0, end));
      }
    } catch {
      console.warn("[rsc-extract] Failed to parse __NEXT_DATA__ JSON");
    }
    return null;
  }
}

// ── 3. Extract metadata from <head> ──

export function parseMetadata(rawHtml: string): Record<string, string> | null {
  const metadata: Record<string, string> = {};
  const metaRegex =
    /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  const metaRevRegex =
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']([^"']+)["'][^>]*>/gi;
  for (const m of rawHtml.matchAll(metaRegex)) metadata[m[1]] = m[2];
  for (const m of rawHtml.matchAll(metaRevRegex)) metadata[m[2]] = m[1];
  return Object.keys(metadata).length > 0 ? metadata : null;
}

// ── 4. Extract font preloads ──

export function parseFontPreloads(rawHtml: string): string[] {
  const preloads: string[] = [];

  const fontLinks = rawHtml.matchAll(
    /<link[^>]+rel=["']preload["'][^>]+href=["']([^"']*_next\/static\/media\/[^"']+)["'][^>]+as=["']font["'][^>]*>/gi,
  );
  for (const m of fontLinks) {
    const filename = m[1].split("/").pop() || m[1];
    preloads.push(filename);
  }

  // Also check for <link rel="stylesheet"> font files
  const fontStylesheets = rawHtml.matchAll(
    /<link[^>]+href=["']([^"']*_next\/static\/media\/[^"']*\.css)["'][^>]*>/gi,
  );
  for (const m of fontStylesheets) {
    if (!preloads.includes(m[1])) {
      preloads.push(m[1]);
    }
  }

  return preloads;
}

// ── 5. Extract script preloads (JS chunks) ──

export function parseScriptPreloads(rawHtml: string): string[] {
  const chunks: string[] = [];
  const scriptSrcs = rawHtml.matchAll(
    /<script[^>]+src=["']([^"']*_next\/static\/chunks\/([^"']+\.js))["'][^>]*>/gi,
  );
  for (const m of scriptSrcs) {
    chunks.push(m[2]);
  }
  return chunks;
}

// ── 6. Parse route tree from __NEXT_DATA__ ──

export function buildRouteTree(
  nextData: Record<string, unknown>,
): RscExtractResult["routeTree"] {
  const routeTree: RscExtractResult["routeTree"] = [];
  const nd = nextData;

  // Next.js Pages Router: routes
  if (nd.routes && typeof nd.routes === "object") {
    for (const [segment, routeInfo] of Object.entries(
      nd.routes as Record<string, any>,
    )) {
      routeTree.push({
        segment,
        page: routeInfo?.page || "",
        layout: "",
        loading: "",
        error: "",
      });
    }
  }

  // Next.js App Router: extract from page props with dynamic query params
  if (nd.query && typeof nd.query === "object") {
    const queryKeys = Object.keys(nd.query as Record<string, unknown>);
    if (queryKeys.length > 0) {
      routeTree.push({
        segment: "[dynamic]",
        page: String(nd.page || ""),
        layout: "",
        loading: "",
        error: "",
      });
    }
  }

  return routeTree;
}

// ── 7. Extract RSC streaming chunk IDs ──

export function parseRscChunks(
  rawHtml: string,
): RscExtractResult["rscPayloads"] {
  const payloads: RscExtractResult["rscPayloads"] = [];
  const rscChunkPattern = /self\.__next_f\.push\([\[(](\d+)/g;
  const seen = new Set<string>();
  for (const m of rawHtml.matchAll(rscChunkPattern)) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      payloads.push({ id: m[1], type: "chunk" });
    }
  }
  return payloads;
}

// ── 8. Detect "use client" directives ──

export function detectClientDirectives(rawHtml: string): string[] {
  const hasUseClient =
    rawHtml.includes('"use client') || rawHtml.includes("'use client");
  if (!hasUseClient) return [];

  const dqCount = (rawHtml.match(/"use client/g) || []).length;
  const sqCount = (rawHtml.match(/'use client/g) || []).length;
  const count = dqCount + sqCount;
  return [
    `use client (${count > 0 ? count : 1} directives found in HTML)`,
  ];
}

// ── 9. Extract server component chunk names ──

export function classifyServerComponents(rawHtml: string): string[] {
  const components: string[] = [];
  const chunkNames = rawHtml.matchAll(
    /["']([^"']*(?:page|layout|loading|error|template|default|not-found)[^"']*)["']/gi,
  );
  for (const m of chunkNames) {
    const name = m[1];
    if (
      name.includes("layout") ||
      name.includes("page") ||
      name.includes("template") ||
      name.includes("not-found")
    ) {
      if (!components.includes(name)) {
        components.push(name);
      }
    }
  }
  return components;
}
