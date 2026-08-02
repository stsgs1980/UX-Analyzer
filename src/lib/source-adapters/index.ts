/**
 * Source Adapters — barrel export.
 *
 * Each adapter is a self-contained module for one source type.
 * Use resolveSourceType() to detect the type, then instantiate the matching adapter.
 */

export type {
  SourceType,
  SourceAdapter,
  FetchContext,
  FetchResult,
  SourceMetadata,
  SourceAdapterFactory,
} from "./types";

export {
  resolveSourceType,
  getSourceTypeLabel,
  isUrlOfType,
} from "./registry";

export { ImageAdapter } from "./image-adapter";
export { PinterestAdapter } from "./pinterest-adapter";
export { PinterestBoardAdapter } from "./pinterest-board-adapter";
export { UrlAdapter } from "./url-adapter";
export { DribbbleAdapter } from "./dribbble-adapter";
export { BehanceAdapter } from "./behance-adapter";
export { CodePenAdapter } from "./codepen-adapter";
export { GitHubAdapter } from "./github-adapter";

/**
 * Create the appropriate adapter instance for the given inputs.
 * This is the main entry point — used by route.ts and tests.
 */
import type { FetchContext, SourceAdapter, SourceType } from "./types";
import { resolveSourceType } from "./registry";
import { ImageAdapter } from "./image-adapter";
import { PinterestAdapter } from "./pinterest-adapter";
import { PinterestBoardAdapter } from "./pinterest-board-adapter";
import { UrlAdapter } from "./url-adapter";
import { DribbbleAdapter } from "./dribbble-adapter";
import { BehanceAdapter } from "./behance-adapter";
import { CodePenAdapter } from "./codepen-adapter";
import { GitHubAdapter } from "./github-adapter";

export function createAdapter(ctx: FetchContext): SourceAdapter {
  const type = resolveSourceType(ctx.urls, ctx.imageBase64);

  switch (type) {
    case "image":
      return new ImageAdapter();
    case "pinterest":
      return new PinterestAdapter();
    case "pinterest-board":
      return new PinterestBoardAdapter();
    case "dribbble":
      return new DribbbleAdapter();
    case "behance":
      return new BehanceAdapter();
    case "codepen":
      return new CodePenAdapter();
    case "github":
      return new GitHubAdapter();
    case "url":
    default:
      return new UrlAdapter();
  }
}
