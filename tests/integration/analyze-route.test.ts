import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  FAKE_HTML,
  FAKE_VLM_RESPONSE,
  FAKE_LLM_RESPONSE_TEXT,
  FAKE_BATCH_LLM_RESPONSE_TEXT,
  createMockZai,
  createMockDb,
  parseSSEStream,
  createPostRequest,
} from "./handlers";

const mockZai = createMockZai();
const mockDb = createMockDb();

vi.mock("z-ai-web-dev-sdk", () => ({
  default: { create: (...args: unknown[]) => mockZai.create(...args) },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/screenshot", () => ({
  captureScreenshot: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/pinterest", () => ({
  isPinterestPin: vi.fn().mockReturnValue(false),
  fetchPinterestOembed: vi.fn().mockResolvedValue(null),
  downloadImageAsBase64: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/url-safety", () => ({
  validateExternalUrl: vi.fn().mockResolvedValue({ safe: true }),
  isImageUrlSafe: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60000 }),
}));

let POST: typeof import("@/app/api/analyze/route").POST;

beforeEach(async () => {
  vi.clearAllMocks();

  const { checkRateLimit } = await import("@/lib/rate-limit");
  vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60000 });

  mockZai.create.mockResolvedValue({
    functions: {
      invoke: vi.fn().mockImplementation((name: string) => {
        if (name === "page_reader") {
          return Promise.resolve({ data: { html: FAKE_HTML, title: "Test Page" } });
        }
        if (name === "web_search") {
          return Promise.resolve([
            { url: "https://example.com/review", name: "Review", snippet: "Good site" },
          ]);
        }
        return Promise.resolve([]);
      }),
    },
    chat: {
      completions: {
        createVision: vi.fn().mockResolvedValue({
          choices: [{ message: { content: FAKE_VLM_RESPONSE } }],
        }),
        create: vi.fn().mockImplementation((opts?: Record<string, unknown>) => {
          const msgs = (opts?.messages as Array<{ content: string }>) || [];
          const prompt = msgs[0]?.content || "";
          if (prompt.includes("DESIGN.md") || prompt.includes("DESIGN-документ")) {
            return Promise.resolve({ choices: [{ message: { content: "# Design System\n\nAuto-generated." } }] });
          }
          if (prompt.includes('type:"batch"')) {
            return Promise.resolve({ choices: [{ message: { content: FAKE_BATCH_LLM_RESPONSE_TEXT } }] });
          }
          return Promise.resolve({ choices: [{ message: { content: FAKE_LLM_RESPONSE_TEXT } }] });
        }),
      },
    },
  });

  mockDb.analysis.create.mockClear();
  mockDb.analysis.update.mockClear();
  mockDb.analysis.findMany.mockResolvedValue([]);

  const mod = await import("@/app/api/analyze/route");
  POST = mod.POST;
});

describe("POST /api/analyze", () => {
  it("returns SSE stream with progress and result events for valid URL", async () => {
    const req = createPostRequest({ urls: ["https://example.com"] });
    const res = await POST(req as any);
    const events = await parseSSEStream(res.body!);

    expect(res.headers.get("Content-Type")).toContain("text/event-stream");

    const types = events.map((e) => e.type);
    expect(types).toContain("progress");
    expect(types).toContain("result");

    const resultEvent = events.find((e) => e.type === "result");
    expect(resultEvent).toBeDefined();
    expect((resultEvent?.data as Record<string, unknown>)?.type).toBeDefined();
  });

  it("returns 400 for invalid URL format", async () => {
    const req = createPostRequest({ urls: ["not-a-url"] });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for empty body", async () => {
    const req = createPostRequest({});
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 for more than 10 URLs", async () => {
    const urls = Array.from({ length: 11 }, (_, i) => `https://example${i}.com`);
    const req = createPostRequest({ urls });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("10");
  });

  it("returns 429 when rate limit exceeded", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = createPostRequest({ urls: ["https://example.com"] });
    const res = await POST(req as any);
    expect(res.status).toBe(429);
  });

  it("returns 400 for oversized image base64", async () => {
    const hugeBase64 = "a".repeat(16 * 1024 * 1024);
    const req = createPostRequest({ imageBase64: hugeBase64 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("слишком большое");
  });

  it("handles batch analysis (2+ URLs) with batch format", async () => {
    const req = createPostRequest({ urls: ["https://example.com", "https://example2.com"] });
    const res = await POST(req as any);
    const events = await parseSSEStream(res.body!);

    const resultEvent = events.find((e) => e.type === "result");
    expect(resultEvent).toBeDefined();
    const data = resultEvent?.data as Record<string, unknown>;
    expect(data?.type).toBe("batch");
  });

  it("progress events have step, message, and progress fields", async () => {
    const req = createPostRequest({ urls: ["https://example.com"] });
    const res = await POST(req as any);
    const events = await parseSSEStream(res.body!);

    const progressEvents = events.filter((e) => e.type === "progress");
    expect(progressEvents.length).toBeGreaterThan(0);

    for (const pe of progressEvents) {
      expect(pe).toHaveProperty("step");
      expect(pe).toHaveProperty("message");
      expect(pe).toHaveProperty("progress");
      expect(typeof pe.step).toBe("string");
      expect(typeof pe.message).toBe("string");
      expect(typeof pe.progress).toBe("number");
    }
  });

  it("sends error event when ZAI SDK create() fails", async () => {
    mockZai.create.mockRejectedValue(new Error("SDK init failure"));

    const req = createPostRequest({ urls: ["https://example.com"] });
    const res = await POST(req as any);
    const events = await parseSSEStream(res.body!);

    const errorEvent = events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    expect(errorEvent?.message).toBeDefined();
  });

  it("creates a DB record and updates it on completion", async () => {
    const req = createPostRequest({ urls: ["https://example.com"] });
    const res = await POST(req as any);
    await parseSSEStream(res.body!);

    expect(mockDb.analysis.create).toHaveBeenCalled();
    expect(mockDb.analysis.update).toHaveBeenCalled();

    const updateCall = mockDb.analysis.update.mock.calls[0]?.[0];
    expect(updateCall?.data?.status).toBe("completed");
  });
});
