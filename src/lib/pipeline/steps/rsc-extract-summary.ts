/**
 * Builds a human-readable summary for RSC extraction results.
 */

import type { RscExtractResult } from "../types";

export function buildSummary(result: RscExtractResult): string {
  const parts: string[] = [];

  parts.push(
    `Next.js ${result.nextData ? "detected (buildId: " + ((result.nextData.buildId as string) || "N/A") + ")" : "detected (no __NEXT_DATA__)"}`,
  );

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

  return parts.join(". ") + ".";
}
