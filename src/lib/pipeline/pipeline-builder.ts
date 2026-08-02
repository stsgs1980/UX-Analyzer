/**
 * Pipeline Builder — dynamically builds step groups based on adapter capabilities.
 *
 * Replaces the hardcoded `groups` array in route.ts.
 * Each adapter declares what it supports (canFetchHtml, canExtractRsc, etc.),
 * and this module translates those capabilities into the correct pipeline.
 */

import type { SourceAdapter } from "@/lib/source-adapters/types";
import type { PipelineStep } from "./types";
import type { StepGroup } from "./runner";

// ── Import all available steps ──
import { fetchSourceStep } from "./steps/fetch-source";
import { fetchPagesStep } from "./steps/fetch-pages";
import { screenshotStep } from "./steps/screenshot";
import { vlmAnalysisStep } from "./steps/vlm-analysis";
import { llmAnalysisStep } from "./steps/llm-analysis";
import { designMdStep } from "./steps/design-md";
import { rscExtractStep } from "./steps/rsc-extract";
import { referenceCodeStep } from "./steps/reference-code";
import { dbSaveStep } from "./steps/db-save";

export interface BuildPipelineOptions {
  adapter: SourceAdapter;
  generateReferenceCode: boolean;
  extractRscPayload: boolean;
}

/**
 * Build the pipeline step groups based on adapter capabilities.
 *
 * Pipeline structure:
 *  1. fetch-source  (always — populates images/metadata)
 *  2. fetch-pages    (if adapter.canFetchHtml and hasMultiplePages)
 *  3. screenshot     (if adapter.canFetchHtml and has image — not for pinterest/image)
 *  4. vlm-analysis   (always — analyzes whatever image we have)
 *  5. llm-analysis   (always — main AI analysis)
 *  6. parallel: design-md + rsc-extract (conditional)
 *  7. reference-code (if requested and adapter supports it)
 *  8. db-save        (always)
 */
export function buildPipeline(opts: BuildPipelineOptions): StepGroup[] {
  const { adapter, generateReferenceCode, extractRscPayload } = opts;
  const groups: StepGroup[] = [];

  // Step 1: Fetch source (always)
  groups.push(fetchSourceStep);

  // Step 2: Fetch additional pages (URL adapters with multi-page support)
  if (adapter.canFetchHtml && adapter.hasMultiplePages) {
    groups.push(fetchPagesStep);
  }

  // Step 3: Screenshot (only for URL-type adapters that can fetch HTML)
  if (adapter.canFetchHtml && adapter.category !== "visual") {
    groups.push(screenshotStep);
  }

  // Step 4: VLM analysis (always — all adapters provide images)
  groups.push(vlmAnalysisStep);

  // Step 5: LLM analysis (always)
  groups.push(llmAnalysisStep);

  // Step 6: Parallel — design-md + RSC extract (conditional)
  const parallelGroup: PipelineStep[] = [designMdStep];
  if (adapter.canExtractRsc && extractRscPayload) {
    parallelGroup.push(rscExtractStep);
  }
  groups.push(parallelGroup);

  // Step 7: Extra steps from adapter (future: pinterest-board aggregator, github readme parser)
  const extras = adapter.extraSteps();
  if (extras.length > 0) {
    groups.push(...extras);
  }

  // Step 8: Reference code (if requested and adapter has content for it)
  if (generateReferenceCode && (adapter.hasSourceCode || adapter.canFetchHtml)) {
    groups.push(referenceCodeStep);
  }

  // Step 9: DB save (always)
  groups.push(dbSaveStep);

  return groups;
}
