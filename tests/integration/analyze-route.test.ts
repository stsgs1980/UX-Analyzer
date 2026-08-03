import { describe, it, expect, mock, beforeEach, spyOn } from 'bun:test';
import {
  FAKE_HTML,
  FAKE_VLM_RESPONSE,
  FAKE_LLM_RESPONSE_TEXT,
  FAKE_BATCH_LLM_RESPONSE_TEXT,
  FAKE_DESIGN_MD,
  createMockZai,
  createMockDb,
  createPostRequest,
} from './handlers';
import * as progressStore from '@/lib/progress-store';

// ── Create mock instances ──
const mockZai = createMockZai();
const mockDb = createMockDb();

// Separate mock functions for modules that need dynamic behavior in tests
const mockCheckRateLimit = mock(() => ({ allowed: true, remaining: 4, resetAt: Date.now() + 60000 }));
const mockValidateExternalUrl = mock(() => Promise.resolve({ safe: true }));
const mockCaptureScreenshot = mock(() => Promise.resolve(null));
const mockIsPinterestPin = mock(() => false);
const mockFetchPinterestOembed = mock(() => Promise.resolve(null));
const mockDownloadImageAsBase64 = mock(() => Promise.resolve(null));
const mockLocalProvider = mock(() => ({
  functions: {
    invoke: mock(() => Promise.resolve({ data: { html: FAKE_HTML, title: 'Test Page' } })),
  },
  chat: {
    completions: {
      create: mock(() => Promise.resolve({ choices: [{ message: { content: FAKE_LLM_RESPONSE_TEXT } }] })),
      createVision: mock(() => Promise.resolve({ choices: [{ message: { content: FAKE_VLM_RESPONSE } }] })),
    },
  },
}));

const mockRunAnalysisPipeline = mock(() => Promise.resolve());

// ── Module mocks (must be before any imports that use these modules) ──
mock.module('z-ai-web-dev-sdk', () => ({
  default: { create: (...args: unknown[]) => mockZai.create(...args) },
}));

mock.module('@/lib/db', () => ({ db: mockDb }));

mock.module('@/lib/screenshot', () => ({
  captureScreenshot: mockCaptureScreenshot,
}));

mock.module('@/lib/pinterest', () => ({
  isPinterestPin: mockIsPinterestPin,
  fetchPinterestOembed: mockFetchPinterestOembed,
  downloadImageAsBase64: mockDownloadImageAsBase64,
}));

mock.module('@/lib/url-safety', () => ({
  validateExternalUrl: mockValidateExternalUrl,
  isImageUrlSafe: mock(() => true),
}));

mock.module('@/lib/rate-limit', () => ({
  checkRateLimit: mockCheckRateLimit,
}));

mock.module('@/lib/gemini-provider', () => ({
  localProvider: mockLocalProvider,
}));

mock.module('@/lib/pipeline/run-analysis', () => ({
  runAnalysisPipeline: mockRunAnalysisPipeline,
}));

// ── Route handler reference (imported dynamically in beforeEach) ──
let POST: typeof import('@/app/api/analyze/route').POST;

beforeEach(async () => {
  // Reset rate-limit mock to default (allowed)
  mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60000 });

  // Reset URL safety mock
  mockValidateExternalUrl.mockResolvedValue({ safe: true });

  // Reset pipeline mock
  mockRunAnalysisPipeline.mockResolvedValue(undefined);

  // Clear DB mock call history
  if (mockDb.analysis.create.mockClear) mockDb.analysis.create.mockClear();
  if (mockDb.analysis.update.mockClear) mockDb.analysis.update.mockClear();
  mockDb.analysis.findMany.mockResolvedValue([]);

  // Clear progress store between tests
  progressStore.deleteProgress('1');
  progressStore.deleteProgress('local-');

  // Fresh import of route handler (picks up current mock state)
  const mod = await import('@/app/api/analyze/route');
  POST = mod.POST;
});

describe('POST /api/analyze', () => {
  it('returns JSON with analysisId for valid URL', async () => {
    const req = createPostRequest({ urls: ['https://example.com'] });
    const res = await POST(req as any);

    expect(res.headers.get('Content-Type')).toContain('application/json');

    const body = await res.json();
    expect(body.analysisId).toBeDefined();
    expect(body.status).toBe('running');
  });

  it('creates a progress store entry', async () => {
    const req = createPostRequest({ urls: ['https://example.com'] });
    const res = await POST(req as any);
    const body = await res.json();

    const progress = progressStore.getProgress(body.analysisId);
    expect(progress).toBeDefined();
    expect(progress!.status).toBe('running');
  });

  it('fires runAnalysisPipeline in background', async () => {
    const req = createPostRequest({ urls: ['https://example.com'] });
    await POST(req as any);

    // Pipeline is fire-and-forget — give it a tick to be called
    await new Promise((r) => setTimeout(r, 10));
    expect(mockRunAnalysisPipeline).toHaveBeenCalled();
  });

  it('returns 400 for invalid URL format', async () => {
    const req = createPostRequest({ urls: ['not-a-url'] });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 400 for empty body', async () => {
    const req = createPostRequest({});
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 for more than 10 URLs', async () => {
    const urls = Array.from({ length: 11 }, (_, i) => `https://example${i}.com`);
    const req = createPostRequest({ urls });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('10');
  });

  it('returns 429 when rate limit exceeded', async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = createPostRequest({ urls: ['https://example.com'] });
    const res = await POST(req as any);
    expect(res.status).toBe(429);
  });

  it('returns 400 for oversized image base64', async () => {
    const hugeBase64 = 'a'.repeat(16 * 1024 * 1024);
    const req = createPostRequest({ imageBase64: hugeBase64 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('слишком большое');
  });

  it('creates a DB record on start', async () => {
    const req = createPostRequest({ urls: ['https://example.com'] });
    await POST(req as any);

    expect(mockDb.analysis.create).toHaveBeenCalled();
    const createCall = (mockDb.analysis.create as any).mock.calls[0]?.[0];
    expect(createCall?.data?.status).toBe('running');
  });
});
