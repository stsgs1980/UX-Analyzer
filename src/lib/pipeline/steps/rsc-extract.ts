/**
 * Pipeline step: Extract RSC (React Server Components) payload from Next.js pages.
 * Parses __NEXT_DATA__, RSC streaming chunks, build manifests, and route tree.
 * Populates: ctx.rscPayload (RscExtractResult)
 *
 * This step is OPTIONAL — controlled by ctx.extractRscPayload flag.
 * Only processes pages where rawHtml is available (from fetch-pages step).
 */

import type { PipelineStep, RscExtractResult } from "../types";
import {
  detectNextJs,
  parseNextData,
  parseMetadata,
  parseFontPreloads,
  parseScriptPreloads,
  buildRouteTree,
  parseRscChunks,
  detectClientDirectives,
  classifyServerComponents,
} from "./rsc-extract-parsers";
import { buildSummary } from "./rsc-extract-summary";

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
 * Core extraction logic — orchestrates parsing helpers.
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

  if (!detectNextJs(rawHtml)) {
    emptyResult.summary = `Целевая страница (${new URL(url).hostname}) не является Next.js приложением. RSC payload extraction неприменим.`;
    return emptyResult;
  }

  const nextData = parseNextData(rawHtml);

  const result: RscExtractResult = {
    ...emptyResult,
    isNextJs: true,
    nextData,
    metadata: parseMetadata(rawHtml),
    fontPreloads: parseFontPreloads(rawHtml),
    scriptPreloads: parseScriptPreloads(rawHtml),
    routeTree: nextData ? buildRouteTree(nextData) : [],
    rscPayloads: parseRscChunks(rawHtml),
    clientComponents: detectClientDirectives(rawHtml),
    serverComponents: classifyServerComponents(rawHtml),
  };

  result.summary = buildSummary(result);

  return result;
}
