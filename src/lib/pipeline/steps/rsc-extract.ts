/**
 * Pipeline step: Extract RSC (React Server Components) payload from Next.js pages.
 * Parses __NEXT_DATA__, RSC streaming chunks, build manifests, and route tree.
 * Populates: ctx.rscPayload (RscExtractResult)
 *
 * This step is OPTIONAL — controlled by ctx.extractRscPayload flag.
 * Only processes pages where rawHtml is available (from fetch-pages step).
 */

import type { PipelineStep, RscExtractResult } from "../types";

export const rscExtractStep: PipelineStep = {
  id: "rsc-extract",
  label: "RSC Payload Extraction",

  async run(ctx) {
    // Skip if not requested or no pages with rawHtml
    if (!ctx.extractRscPayload) {
      return;
    }

    const pagesWithHtml = ctx.pageContents.filter((p) => p.rawHtml && !p.error);
    if (pagesWithHtml.length === 0) {
      console.log("[rsc-extract] Skipped: no pages with raw HTML");
      return;
    }

    ctx.send({
      type: "progress",
      step: "rsc_extract",
      message: "Извлекаю RSC payload из Next.js страниц...",
      progress: 0.93,
      analysisId: ctx.analysisId,
    });

    // Process the first page that has rawHtml (primary URL)
    const primaryPage = pagesWithHtml[0];
    const result = extractRscFromHtml(primaryPage.url, primaryPage.rawHtml!);

    ctx.rscPayload = result;

    // Add RSC data to analysis result if available
    if (ctx.analysisResult) {
      (ctx.analysisResult as Record<string, unknown>).rscPayload = {
        isNextJs: result.isNextJs,
        serverComponents: result.serverComponents,
        clientComponents: result.clientComponents,
        routeTree: result.routeTree,
        summary: result.summary,
        metadata: result.metadata,
      };
    }

    ctx.send({
      type: "rsc_payload",
      content: result,
      analysisId: ctx.analysisId,
    });

    console.log(
      "[rsc-extract] Done:",
      result.isNextJs ? "Next.js detected" : "Not Next.js",
      "— SC:", result.serverComponents.length,
      "CC:", result.clientComponents.length,
      "routes:", result.routeTree.length,
    );
  },
};

/**
 * Core extraction logic — pure function, testable outside pipeline.
 * Exported for unit testing.
 */
export function extractRscFromHtml(url: string, rawHtml: string): RscExtractResult {
  const emptyResult: RscExtractResult = {
    url,
    isNextJs: false,
    nextData: null,
    rscPayloads: [],
    routeTree: [],
    serverComponents: [],
    clientComponents: [],
    metadata: null,
    fontPreloads: [],
    scriptPreloads: [],
    summary: "",
  };

  // ── 1. Detect Next.js ──
  const isNextJs =
    rawHtml.includes("__NEXT_DATA__") ||
    rawHtml.includes("_next/") ||
    rawHtml.includes("next-route-announcer") ||
    /<script[^>]*src=["'][^"']*_next\/static/.test(rawHtml);

  if (!isNextJs) {
    emptyResult.summary = `Целевая страница (${new URL(url).hostname}) не является Next.js приложением. RSC payload extraction неприменим.`;
    return emptyResult;
  }

  const result: RscExtractResult = {
    ...emptyResult,
    isNextJs: true,
  };

  // ── 2. Extract __NEXT_DATA__ ──
  const nextDataMatch = rawHtml.match(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
  );
  if (nextDataMatch) {
    const rawJson = nextDataMatch[1].trim();
    try {
      result.nextData = JSON.parse(rawJson);
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
          result.nextData = JSON.parse(rawJson.substring(0, end));
        }
      } catch {
        console.warn("[rsc-extract] Failed to parse __NEXT_DATA__ JSON");
      }
    }
  }

  // ── 3. Extract metadata from <head> ──
  const metadata: Record<string, string> = {};
  const metaRegex =
    /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  const metaRevRegex =
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']([^"']+)["'][^>]*>/gi;
  for (const m of rawHtml.matchAll(metaRegex)) metadata[m[1]] = m[2];
  for (const m of rawHtml.matchAll(metaRevRegex)) metadata[m[2]] = m[1];
  result.metadata = Object.keys(metadata).length > 0 ? metadata : null;

  // ── 4. Extract font preloads ──
  const fontLinks = rawHtml.matchAll(
    /<link[^>]+rel=["']preload["'][^>]+href=["']([^"']*_next\/static\/media\/[^"']+)["'][^>]+as=["']font["'][^>]*>/gi,
  );
  for (const m of fontLinks) {
    const filename = m[1].split("/").pop() || m[1];
    result.fontPreloads.push(filename);
  }

  // Also check for <link rel="stylesheet"> font files
  const fontStylesheets = rawHtml.matchAll(
    /<link[^>]+href=["']([^"']*_next\/static\/media\/[^"']*\.css)["'][^>]*>/gi,
  );
  for (const m of fontStylesheets) {
    if (!result.fontPreloads.includes(m[1])) {
      result.fontPreloads.push(m[1]);
    }
  }

  // ── 5. Extract script preloads (JS chunks) ──
  const scriptSrcs = rawHtml.matchAll(
    /<script[^>]+src=["']([^"']*_next\/static\/chunks\/([^"']+\.js))["'][^>]*>/gi,
  );
  for (const m of scriptSrcs) {
    // Store the chunk filename (e.g. "webpack.js", "main-app.js", "app/page.js")
    result.scriptPreloads.push(m[2]);
  }

  // ── 6. Parse build manifest / route tree from __NEXT_DATA__ ──
  if (result.nextData) {
    const nd = result.nextData;

    // Next.js 13+ App Router: buildId
    const buildId = nd.buildId as string | undefined;

    // Next.js Pages Router: routes
    if (nd.routes && typeof nd.routes === "object") {
      for (const [segment, routeInfo] of Object.entries(nd.routes as Record<string, any>)) {
        result.routeTree.push({
          segment,
          page: routeInfo?.page || "",
          layout: "",
          loading: "",
          error: "",
        });
      }
    }

    // Next.js App Router: extract from runtime config or page props
    if (nd.query && typeof nd.query === "object") {
      const queryKeys = Object.keys(nd.query as Record<string, unknown>);
      if (queryKeys.length > 0) {
        result.routeTree.push({
          segment: "[dynamic]",
          page: String(nd.page || ""),
          layout: "",
          loading: "",
          error: "",
        });
      }
    }
  }

  // Simple and robust: just find the chunk ID right after the opening bracket
  const rscChunkPattern = /self\.__next_f\.push\(\[(\d+)/g;
  const rscChunkIds: Set<string> = new Set();
  for (const m of rawHtml.matchAll(rscChunkPattern)) {
    if (!rscChunkIds.has(m[1])) {
      rscChunkIds.add(m[1]);
      result.rscPayloads.push({
        id: m[1],
        type: "chunk",
      });
    }
  }

  // ── 8. Detect "use client" directives in inline scripts ──
  // In RSC streaming HTML, "use client" appears as "use client\n (followed by \n, not closing quote)
  // Use string includes for reliable detection (avoids bun regex engine quirks)
  const hasUseClient = rawHtml.includes('"use client') || rawHtml.includes("'use client");
  if (hasUseClient) {
    // Count occurrences
    const dqCount = (rawHtml.match(/"use client/g) || []).length;
    const sqCount = (rawHtml.match(/'use client/g) || []).length;
    const count = dqCount + sqCount;
    result.clientComponents.push(`use client (${count > 0 ? count : 1} directives found in HTML)`);
  }

  // ── 9. Extract chunk names to classify server/client components ──
  // Next.js webpack chunks typically named like: main-app, pages/index, etc.
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
      if (!result.serverComponents.includes(name)) {
        result.serverComponents.push(name);
      }
    }
  }

  // ── 10. Build summary ──
  const parts: string[] = [];
  parts.push(`Next.js ${result.nextData ? "detected (buildId: " + (result.nextData.buildId || "N/A") + ")" : "detected (no __NEXT_DATA__)"}`);

  if (result.nextData) {
    const runtime = (result.nextData as any).runtime;
    if (runtime) parts.push(`Runtime: ${runtime}`);
    const propsPage = (result.nextData as any).page;
    if (propsPage) parts.push(`Page: ${propsPage}`);
  }

  if (result.serverComponents.length > 0) {
    parts.push(`Server components: ${result.serverComponents.length}`);
  }
  if (result.clientComponents.length > 0) {
    parts.push(`Client components: ${result.clientComponents.length}`);
  }
  if (result.rscPayloads.length > 0) {
    parts.push(`RSC chunks: ${result.rscPayloads.length}`);
  }
  if (result.fontPreloads.length > 0) {
    parts.push(`Font assets: ${result.fontPreloads.length}`);
  }
  if (result.routeTree.length > 0) {
    parts.push(`Routes: ${result.routeTree.length}`);
  }

  result.summary = parts.join(". ") + ".";

  return result;
}
