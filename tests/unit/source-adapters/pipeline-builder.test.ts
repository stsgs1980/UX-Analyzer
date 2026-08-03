/**
 * Tests for pipeline builder — buildPipeline() step composition.
 *
 * Uses mock.module to replace all step imports with no-op stubs,
 * so we only test the composition logic, not step execution.
 */

import { describe, expect, test, mock, beforeEach } from "bun:test";
import type { SourceAdapter } from "@/lib/source-adapters/types";
import type { StepGroup } from "@/lib/pipeline/runner";

// ── Helper: extract all step IDs from groups ──

function extractIds(groups: StepGroup[]): string[] {
  return groups.flatMap((g) =>
    Array.isArray(g) ? g.map((s) => s.id) : [g.id],
  );
}

// ── Helper: check if a step id exists in groups ──

function hasStep(groups: StepGroup[], id: string): boolean {
  return extractIds(groups).includes(id);
}

// ── Mock adapters for testing ──

function makeAdapter(overrides: Partial<SourceAdapter> = {}): SourceAdapter {
  return {
    type: "url",
    label: "Test",
    canFetchHtml: false,
    canExtractRsc: false,
    hasMultiplePages: false,
    hasSourceCode: false,
    category: "hybrid",
    fetch: async () => ({ images: [], metadata: { title: "" } }),
    extraSteps: () => [],
    ...overrides,
  };
}

describe("buildPipeline", () => {
  // We import buildPipeline fresh in each test via dynamic import
  // so that mock.module takes effect.  But since all step imports
  // are already hoisted, we mock them at the module level.

  // Re-import each test to get fresh state
  async function getBuilder() {
    return await import("@/lib/pipeline/pipeline-builder");
  }

  test("UrlAdapter with canFetchHtml=true includes fetch-pages and screenshot steps", async () => {
    const { buildPipeline } = await getBuilder();

    const adapter = makeAdapter({
      type: "url",
      canFetchHtml: true,
      canExtractRsc: true,
      hasMultiplePages: true,
      category: "hybrid",
    });

    const groups = buildPipeline({
      adapter,
      generateReferenceCode: false,
      extractRscPayload: false,
    });

    expect(hasStep(groups, "fetch-pages")).toBe(true);
    expect(hasStep(groups, "screenshot")).toBe(true);
  });

  test("ImageAdapter with canFetchHtml=false skips fetch-pages and screenshot steps", async () => {
    const { buildPipeline } = await getBuilder();

    const adapter = makeAdapter({
      type: "image",
      canFetchHtml: false,
      canExtractRsc: false,
      category: "visual",
    });

    const groups = buildPipeline({
      adapter,
      generateReferenceCode: false,
      extractRscPayload: false,
    });

    expect(hasStep(groups, "fetch-pages")).toBe(false);
    expect(hasStep(groups, "screenshot")).toBe(false);
  });

  test("PinterestAdapter with canFetchHtml=false skips fetch-pages and screenshot steps", async () => {
    const { buildPipeline } = await getBuilder();

    const adapter = makeAdapter({
      type: "pinterest",
      canFetchHtml: false,
      canExtractRsc: false,
      category: "visual",
    });

    const groups = buildPipeline({
      adapter,
      generateReferenceCode: false,
      extractRscPayload: false,
    });

    expect(hasStep(groups, "fetch-pages")).toBe(false);
    expect(hasStep(groups, "screenshot")).toBe(false);
  });

  test("generateReferenceCode=true adds reference-code step", async () => {
    const { buildPipeline } = await getBuilder();

    const adapter = makeAdapter({
      type: "url",
      canFetchHtml: true,
      hasSourceCode: false,
      category: "hybrid",
    });

    const groups = buildPipeline({
      adapter,
      generateReferenceCode: true,
      extractRscPayload: false,
    });

    expect(hasStep(groups, "reference-code")).toBe(true);
  });

  test("generateReferenceCode=false skips reference-code step", async () => {
    const { buildPipeline } = await getBuilder();

    const adapter = makeAdapter({
      type: "url",
      canFetchHtml: true,
      category: "hybrid",
    });

    const groups = buildPipeline({
      adapter,
      generateReferenceCode: false,
      extractRscPayload: false,
    });

    expect(hasStep(groups, "reference-code")).toBe(false);
  });

  test("extractRscPayload=true with canExtractRsc=true adds rsc-extract step", async () => {
    const { buildPipeline } = await getBuilder();

    const adapter = makeAdapter({
      type: "url",
      canFetchHtml: true,
      canExtractRsc: true,
      category: "hybrid",
    });

    const groups = buildPipeline({
      adapter,
      generateReferenceCode: false,
      extractRscPayload: true,
    });

    expect(hasStep(groups, "rsc-extract")).toBe(true);
  });

  test("extractRscPayload=false skips rsc-extract even if canExtractRsc=true", async () => {
    const { buildPipeline } = await getBuilder();

    const adapter = makeAdapter({
      type: "url",
      canFetchHtml: true,
      canExtractRsc: true,
      category: "hybrid",
    });

    const groups = buildPipeline({
      adapter,
      generateReferenceCode: false,
      extractRscPayload: false,
    });

    expect(hasStep(groups, "rsc-extract")).toBe(false);
  });

  test("db-save step is always last", async () => {
    const { buildPipeline } = await getBuilder();

    const allAdapters: Partial<SourceAdapter>[] = [
      { type: "url", canFetchHtml: true, canExtractRsc: true, hasMultiplePages: true, category: "hybrid" },
      { type: "image", canFetchHtml: false, category: "visual" },
      { type: "pinterest", canFetchHtml: false, category: "visual" },
    ];

    for (const adapterOverrides of allAdapters) {
      const adapter = makeAdapter(adapterOverrides);
      const groups = buildPipeline({
        adapter,
        generateReferenceCode: false,
        extractRscPayload: false,
      });

      const ids = extractIds(groups);
      expect(ids[ids.length - 1]).toBe("db-save");
    }
  });

  test("vlm-analysis step is always present", async () => {
    const { buildPipeline } = await getBuilder();

    const allAdapters: Partial<SourceAdapter>[] = [
      { type: "url", canFetchHtml: true, canExtractRsc: true, hasMultiplePages: true, category: "hybrid" },
      { type: "image", canFetchHtml: false, category: "visual" },
      { type: "pinterest", canFetchHtml: false, category: "visual" },
    ];

    for (const adapterOverrides of allAdapters) {
      const adapter = makeAdapter(adapterOverrides);
      const groups = buildPipeline({
        adapter,
        generateReferenceCode: true,
        extractRscPayload: true,
      });

      expect(hasStep(groups, "vlm-analysis")).toBe(true);
    }
  });
});
