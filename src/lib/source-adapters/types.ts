/**
 * Source Adapter Pattern — Core Types
 *
 * Replaces scattered if/else source-type conditionals with
 * a self-contained adapter interface per source type.
 */

import type { PipelineStep, PageContent } from '@/lib/pipeline/types';

/** All supported source type identifiers */
export type SourceType =
  'url' | 'pinterest' | 'pinterest-board' | 'image' | 'dribbble' | 'behance' | 'codepen' | 'github';

/**
 * A source adapter — self-contained module for one source type.
 * Declares capabilities via boolean flags; pipeline runner uses
 * these to decide which steps to execute.
 */
export interface SourceAdapter {
  /** Unique identifier for this adapter type */
  readonly type: SourceType;

  /** Human-readable label for UI display */
  readonly label: string;

  /** Can this adapter fetch raw HTML pages for analysis? */
  readonly canFetchHtml: boolean;

  /** Can this adapter extract React Server Components? */
  readonly canExtractRsc: boolean;

  /** Can this adapter provide multiple pages? */
  readonly hasMultiplePages: boolean;

  /** Can this adapter provide raw source code? */
  readonly hasSourceCode: boolean;

  /** Category: affects pipeline path selection */
  readonly category: 'visual' | 'code' | 'hybrid';

  /**
   * Primary fetch — returns extracted data for the pipeline.
   * Called by the adapter-fetch pipeline step.
   */
  fetch(ctx: FetchContext): Promise<FetchResult>;

  /**
   * Extra pipeline steps specific to this adapter (optional).
   * Return empty array if no extra steps needed.
   */
  extraSteps(): PipelineStep[];
}

/** Context passed to adapter.fetch() */
export interface FetchContext {
  urls: string[];
  imageBase64?: string;
  imageFileName?: string;
  /** ZAI SDK instance for page_reader, web_search etc. */
  zai: any;
}

/** Unified output from any adapter's fetch() */
export interface FetchResult {
  /** Extracted images (for VLM analysis) */
  images: Array<{ base64: string; url?: string; alt?: string }>;

  /** Raw HTML content (if available) */
  htmlContent?: string;

  /** Source code (if available — CodePen, GitHub) */
  sourceCode?: string;

  /** Language of source code (e.g. "tsx", "html") */
  sourceCodeLanguage?: string;

  /** Metadata from the source */
  metadata: SourceMetadata;

  /** Additional pages (if multi-page) */
  additionalPages?: PageContent[];
}

/** Metadata extracted from any source */
export interface SourceMetadata {
  title: string;
  author?: string;
  authorUrl?: string;
  description?: string;
  thumbnailUrl?: string;
  originalUrl?: string;
  /** Platform-specific metadata */
  extra?: Record<string, unknown>;
}

/** Factory function type for creating adapter instances */
export type SourceAdapterFactory = (ctx: FetchContext) => SourceAdapter;
