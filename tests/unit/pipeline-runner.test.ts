/**
 * Tests for pipeline runner — sequential + parallel step execution.
 */

import { describe, expect, test, mock, beforeEach } from "bun:test";
import { runPipeline } from "@/lib/pipeline/runner";
import type { PipelineStep, PipelineContext, StepGroup } from "@/lib/pipeline/runner";

// Re-import types from the actual module
import type { PipelineContext as CtxType, PipelineStep as StepType } from "@/lib/pipeline/types";

function createMockCtx(): CtxType {
  const sent: Array<Record<string, unknown>> = [];
  return {
    urls: [],
    hasImageUpload: false,
    hasUrls: false,
    pinterestSource: false,
    sourceType: "url",
    zai: {} as any,
    primaryZai: {} as any,
    aiProviderRef: { current: "zai" },
    pageContents: [],
    searchResults: [],
    extractedImageBase64: null,
    extractedImageUrl: null,
    vlmResult: null,
    designMdContent: null,
    techFingerprintsText: null,
    dataSources: [],
    pinterestData: null,
    generateReferenceCode: false,
    extractRscPayload: false,
    analysisResult: null,
    referenceCode: null,
    codePreviewHtml: null,
    rscPayload: null,
    analysisId: "test-id",
    closeWriter: async () => {},
    send: (data: Record<string, unknown>) => { sent.push(data); },
    // Expose sent array for assertions
    _sent: sent,
  } as any;
}

function step(id: string, label: string, runFn: (ctx: CtxType) => Promise<void>): StepType {
  return { id, label, run: runFn };
}

describe("runPipeline", () => {
  test("runs single steps sequentially", async () => {
    const order: string[] = [];
    const ctx = createMockCtx();

    const s1 = step("a", "A", async () => { order.push("a"); });
    const s2 = step("b", "B", async () => { order.push("b"); });
    const s3 = step("c", "C", async () => { order.push("c"); });

    await runPipeline({
      ctx,
      groups: [s1, s2, s3],
    });

    expect(order).toEqual(["a", "b", "c"]);
  });

  test("runs parallel group steps concurrently", async () => {
    const order: string[] = [];
    const ctx = createMockCtx();

    const slow = step("slow", "Slow", async () => {
      order.push("slow-start");
      await new Promise((r) => setTimeout(r, 50));
      order.push("slow-end");
    });

    const fast = step("fast", "Fast", async () => {
      order.push("fast-start");
      await new Promise((r) => setTimeout(r, 10));
      order.push("fast-end");
    });

    await runPipeline({
      ctx,
      groups: [[slow, fast]],
    });

    // Both start before either ends
    expect(order).toEqual(["slow-start", "fast-start", "fast-end", "slow-end"]);
  });

  test("parallel step failure sends warn and continues if other steps succeed", async () => {
    const ctx = createMockCtx();
    let okRan = false;

    const failing = step("fail", "Fail", async () => {
      throw new Error("boom");
    });

    const ok = step("ok", "OK", async () => {
      okRan = true;
    });

    await runPipeline({
      ctx,
      groups: [[failing, ok]],
    });

    expect(okRan).toBe(true);
    const sent = (ctx as any)._sent as Array<Record<string, unknown>>;
    const warns = sent.filter((e) => e.type === "warn");
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect((warns[0].message as string)).toContain("Fail");
  });

  test("calls onError and sends error event when ALL parallel steps fail", async () => {
    const ctx = createMockCtx();
    let errorMsg = "";

    await runPipeline({
      ctx,
      groups: [[
        step("f1", "F1", async () => { throw new Error("err1"); }),
        step("f2", "F2", async () => { throw new Error("err2"); }),
      ]],
      onError: async (_ctx, err) => { errorMsg = err instanceof Error ? err.message : String(err); },
    });

    // Pipeline catches the error via onError — does not reject
    expect(errorMsg).toBe("err1");
    const sent = (ctx as any)._sent as Array<Record<string, unknown>>;
    expect(sent.some((e) => e.type === "error")).toBe(true);
  });

  test("sequential step failure aborts pipeline", async () => {
    const ctx = createMockCtx();
    let thirdRan = false;

    await runPipeline({
      ctx,
      groups: [
        step("ok", "OK", async () => {}),
        step("fail", "Fail", async () => { throw new Error("fatal"); }),
        step("third", "Third", async () => { thirdRan = true; }),
      ],
    });

    expect(thirdRan).toBe(false);
    const sent = (ctx as any)._sent as Array<Record<string, unknown>>;
    expect(sent.some((e) => e.type === "error")).toBe(true);
  });

  test("mixed sequential and parallel groups run in correct order", async () => {
    const order: string[] = [];
    const ctx = createMockCtx();

    await runPipeline({
      ctx,
      groups: [
        step("s1", "S1", async () => { order.push("s1"); }),
        step("s2", "S2", async () => {
          order.push("s2-start");
          await new Promise((r) => setTimeout(r, 20));
          order.push("s2-end");
        }),
        // Parallel group after s2
        [
          step("p1", "P1", async () => {
            order.push("p1");
          }),
          step("p2", "P2", async () => {
            order.push("p2");
          }),
        ],
        // Sequential after parallel
        step("s3", "S3", async () => { order.push("s3"); }),
      ],
    });

    // s1 → s2 → p1||p2 → s3
    expect(order[0]).toBe("s1");
    expect(order[1]).toBe("s2-start");
    expect(order[2]).toBe("s2-end");
    // p1 and p2 after s2
    const p1Idx = order.indexOf("p1");
    const p2Idx = order.indexOf("p2");
    expect(p1Idx).toBeGreaterThan(order.indexOf("s2-end"));
    expect(p2Idx).toBeGreaterThan(order.indexOf("s2-end"));
    // s3 after both p1 and p2
    expect(order[order.length - 1]).toBe("s3");
  });

  test("sends final result when analysisResult is set", async () => {
    const ctx = createMockCtx();
    ctx.analysisResult = { url: "https://example.com" };

    await runPipeline({
      ctx,
      groups: [],
    });

    const sent = (ctx as any)._sent as Array<Record<string, unknown>>;
    const resultEvent = sent.find((e) => e.type === "result");
    expect(resultEvent).toBeDefined();
    expect((resultEvent as any).data.url).toBe("https://example.com");
    expect((resultEvent as any).analysisId).toBe("test-id");
  });

  test("calls onSuccess after all groups complete", async () => {
    const ctx = createMockCtx();
    let called = false;

    await runPipeline({
      ctx,
      groups: [step("s1", "S1", async () => {})],
      onSuccess: async () => { called = true; },
    });

    expect(called).toBe(true);
  });

  test("calls onError when pipeline fails", async () => {
    const ctx = createMockCtx();
    let errorMsg = "";

    await runPipeline({
      ctx,
      groups: [step("fail", "Fail", async () => { throw new Error("test error"); })],
      onError: async (_ctx, err) => { errorMsg = err instanceof Error ? err.message : String(err); },
    });

    expect(errorMsg).toBe("test error");
  });

  test("calls onFinally even on failure", async () => {
    const ctx = createMockCtx();
    let finallyCalled = false;

    await runPipeline({
      ctx,
      groups: [step("fail", "Fail", async () => { throw new Error("boom"); })],
      onFinally: async () => { finallyCalled = true; },
    });

    expect(finallyCalled).toBe(true);
  });
});
