/**
 * Pipeline architecture types for UX-Analyzer.
 * Each step receives a PipelineContext, mutates it, and returns void.
 * Steps are composed by runPipeline() in runner.ts.
 */

import type { VlmAnalysisResult } from '@/lib/vlm-prompt';

export type { VlmAnalysisResult };

/** Shared mutable context passed through all pipeline steps */
export interface PipelineContext {
  // ── Input (set before pipeline starts) ──
  urls: string[];
  imageBase64?: string;
  imageFileName?: string;
  hasImageUpload: boolean;
  hasUrls: boolean;
  pinterestSource: boolean;
  sourceType: 'url' | 'pinterest' | 'upload';

  // ── AI providers (set during init step) ──
  zai: any;
  primaryZai: any;
  aiProviderRef: { current: string };

  // ── Collected data (populated by steps) ──
  pageContents: PageContent[];
  searchResults: SearchResult[];
  extractedImageBase64: string | null;
  extractedImageUrl: string | null;
  vlmResult: VlmAnalysisResult | null;
  designMdContent: string | null;
  techFingerprintsText: string | null;
  dataSources: string[];
  pinterestData: { title: string; authorName: string; thumbnailUrl: string } | null;

  // ── Options (from user input) ──
  generateReferenceCode: boolean;
  extractRscPayload: boolean;

  // ── Final result (set by llm-analysis step) ──
  analysisResult: Record<string, unknown> | null;

  // ── Reference code (set by reference-code step) ──
  referenceCode: string | null;
  codePreviewHtml: string | null;

  // ── RSC payload (set by rsc-extract step) ──
  rscPayload: RscExtractResult | null;

  // ── DB (set before pipeline starts) ──
  analysisId: string | null;

  // ── Close writer (set before pipeline starts) ──
  closeWriter: () => Promise<void>;

  // ── SSE helpers (set before pipeline starts) ──
  send: (data: Record<string, unknown>) => void;
}

export interface PageContent {
  url: string;
  title: string;
  content: string;
  rawHtml?: string;
  error?: string;
}

export interface RscExtractResult {
  url: string;
  isNextJs: boolean;
  nextData: Record<string, unknown> | null;
  rscPayloads: Array<{
    id: string;
    type: string;
  }>;
  routeTree: Array<{
    segment: string;
    page: string;
    layout: string;
    loading: string;
    error: string;
  }>;
  serverComponents: string[];
  clientComponents: string[];
  metadata: Record<string, string> | null;
  fontPreloads: string[];
  scriptPreloads: string[];
  summary: string;
}

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

/**
 * A single pipeline step — pure function receiving shared context.
 * Steps are run sequentially by runPipeline().
 * Each step should:
 *   1. Read from ctx what it needs
 *   2. Do its work (call APIs, process data)
 *   3. Write results back to ctx
 *   4. Call ctx.send() for progress updates
 *   5. Throw on fatal error (caught by runner)
 */
export interface PipelineStep {
  /** Unique step identifier (used in logging) */
  id: string;
  /** Human-readable step name (shown in SSE progress) */
  label: string;
  /**
   * Execute the step. Throw to abort the pipeline.
   * @param ctx - mutable shared context
   */
  run: (ctx: PipelineContext) => Promise<void>;
}
