/**
 * Tests for individual source adapters and createAdapter() factory.
 */

import { describe, expect, test, mock, beforeEach } from "bun:test";

// ── Mock dependencies BEFORE importing adapters ──

const mockIsPinterestPin = mock(() => false);
const mockFetchPinterestOembed = mock(() => Promise.resolve(null));
const mockDownloadImageAsBase64 = mock(() => Promise.resolve(null));
const mockIsImageUrlSafe = mock(() => true);

mock.module("@/lib/pinterest", () => ({
  isPinterestPin: mockIsPinterestPin,
  fetchPinterestOembed: mockFetchPinterestOembed,
  downloadImageAsBase64: mockDownloadImageAsBase64,
}));

mock.module("@/lib/url-safety", () => ({
  isImageUrlSafe: mockIsImageUrlSafe,
  validateExternalUrl: mock(() => Promise.resolve({ valid: true, url: "" })),
}));

// ── Now import adapters (they'll use mocked deps) ──

import { ImageAdapter } from "@/lib/source-adapters/image-adapter";
import { PinterestAdapter } from "@/lib/source-adapters/pinterest-adapter";
import { UrlAdapter } from "@/lib/source-adapters/url-adapter";
import { GitHubAdapter } from "@/lib/source-adapters/github-adapter";
import { createAdapter } from "@/lib/source-adapters/index";
import type { FetchContext } from "@/lib/source-adapters/types";

// ── Helpers ──

function makeCtx(overrides: Partial<FetchContext> = {}): FetchContext {
  return {
    urls: [],
    zai: {},
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════
// ImageAdapter
// ════════════════════════════════════════════════════════════

describe("ImageAdapter", () => {
  let adapter: ImageAdapter;

  beforeEach(() => {
    adapter = new ImageAdapter();
    mockIsImageUrlSafe.mockImplementation(() => true);
    mockDownloadImageAsBase64.mockImplementation(() => Promise.resolve(null));
  });

  test('type is "image"', () => {
    expect(adapter.type).toBe("image");
  });

  test("canFetchHtml is false", () => {
    expect(adapter.canFetchHtml).toBe(false);
  });

  test('category is "visual"', () => {
    expect(adapter.category).toBe("visual");
  });

  test("extraSteps returns empty array", () => {
    expect(adapter.extraSteps()).toEqual([]);
  });

  test("fetch with base64 returns image in result", async () => {
    const ctx = makeCtx({
      imageBase64: "iVBORw0KGgoAAAANSUhEUg==",
      imageFileName: "screenshot.png",
    });

    const result = await adapter.fetch(ctx);

    expect(result.images).toHaveLength(1);
    expect(result.images[0].base64).toBe("iVBORw0KGgoAAAANSUhEUg==");
    expect(result.images[0].alt).toBe("screenshot.png");
    expect(result.metadata.title).toBe("screenshot.png");
  });

  test("fetch with image URL (mocked download) returns image in result", async () => {
    const fakeBase64 = "FAKE_IMAGE_DATA";
    mockDownloadImageAsBase64.mockImplementation(() => Promise.resolve(fakeBase64));

    const ctx = makeCtx({
      urls: ["https://example.com/photo.png"],
    });

    const result = await adapter.fetch(ctx);

    expect(result.images).toHaveLength(1);
    expect(result.images[0].base64).toBe(fakeBase64);
    expect(result.images[0].url).toBe("https://example.com/photo.png");
    expect(result.metadata.title).toBe("photo.png");
    expect(result.metadata.originalUrl).toBe("https://example.com/photo.png");
  });

  test("fetch with no valid image returns empty images array", async () => {
    mockIsImageUrlSafe.mockImplementation(() => false);

    const ctx = makeCtx({ urls: ["https://example.com/not-an-image"] });

    const result = await adapter.fetch(ctx);

    expect(result.images).toHaveLength(0);
    expect(result.metadata.title).toBe("Image");
  });
});

// ════════════════════════════════════════════════════════════
// PinterestAdapter
// ════════════════════════════════════════════════════════════

describe("PinterestAdapter", () => {
  let adapter: PinterestAdapter;

  beforeEach(() => {
    adapter = new PinterestAdapter();
    // Reset all mocks to safe defaults
    mockIsPinterestPin.mockImplementation(() => false);
    mockFetchPinterestOembed.mockImplementation(() => Promise.resolve(null));
    mockDownloadImageAsBase64.mockImplementation(() => Promise.resolve(null));
  });

  test('type is "pinterest"', () => {
    expect(adapter.type).toBe("pinterest");
  });

  test("canFetchHtml is false", () => {
    expect(adapter.canFetchHtml).toBe(false);
  });

  test('category is "visual"', () => {
    expect(adapter.category).toBe("visual");
  });

  test("extraSteps returns empty array", () => {
    expect(adapter.extraSteps()).toEqual([]);
  });

  test("fetch with valid pin URL returns metadata", async () => {
    mockIsPinterestPin.mockImplementation(() => true);
    mockFetchPinterestOembed.mockImplementation(() =>
      Promise.resolve({
        title: "Beautiful UI",
        authorName: "Designer",
        authorUrl: "https://pinterest.com/designer",
        thumbnailUrl: "https://pinterest.com/thumb.jpg",
        width: 800,
        height: 600,
      }),
    );
    mockDownloadImageAsBase64.mockImplementation(() =>
      Promise.resolve("FAKE_THUMB_BASE64"),
    );

    const ctx = makeCtx({ urls: ["https://pinterest.com/pin/123/"] });
    const result = await adapter.fetch(ctx);

    expect(result.metadata.title).toBe("Beautiful UI");
    expect(result.metadata.author).toBe("Designer");
    expect(result.metadata.authorUrl).toBe("https://pinterest.com/designer");
    expect(result.metadata.thumbnailUrl).toBe("https://pinterest.com/thumb.jpg");
    expect(result.metadata.originalUrl).toBe("https://pinterest.com/pin/123/");
    expect(result.metadata.extra).toEqual({ width: 800, height: 600 });
    expect(result.images).toHaveLength(1);
    expect(result.images[0].base64).toBe("FAKE_THUMB_BASE64");
  });

  test("fetch with invalid URL returns empty result", async () => {
    mockIsPinterestPin.mockImplementation(() => false);

    const ctx = makeCtx({ urls: ["https://example.com/not-pinterest"] });
    const result = await adapter.fetch(ctx);

    expect(result.images).toHaveLength(0);
    expect(result.metadata.title).toBe("Pinterest Pin");
  });
});

// ════════════════════════════════════════════════════════════
// UrlAdapter
// ════════════════════════════════════════════════════════════

describe("UrlAdapter", () => {
  let adapter: UrlAdapter;

  beforeEach(() => {
    adapter = new UrlAdapter();
  });

  test('type is "url"', () => {
    expect(adapter.type).toBe("url");
  });

  test("canFetchHtml is true", () => {
    expect(adapter.canFetchHtml).toBe(true);
  });

  test("canExtractRsc is true", () => {
    expect(adapter.canExtractRsc).toBe(true);
  });

  test('category is "hybrid"', () => {
    expect(adapter.category).toBe("hybrid");
  });

  test("extraSteps returns empty array", () => {
    expect(adapter.extraSteps()).toEqual([]);
  });

  test("fetch returns empty images, metadata with URL", async () => {
    const ctx = makeCtx({ urls: ["https://example.com/page"] });
    const result = await adapter.fetch(ctx);

    expect(result.images).toHaveLength(0);
    expect(result.metadata.title).toBe("https://example.com/page");
    expect(result.metadata.originalUrl).toBe("https://example.com/page");
  });
});

// ════════════════════════════════════════════════════════════
// createAdapter() factory
// ════════════════════════════════════════════════════════════

describe("createAdapter", () => {
  test("image input -> ImageAdapter", () => {
    const ctx = makeCtx({
      imageBase64: "base64data",
    });
    const adapter = createAdapter(ctx);
    expect(adapter).toBeInstanceOf(ImageAdapter);
  });

  test("Pinterest URL -> PinterestAdapter", () => {
    const ctx = makeCtx({
      urls: ["https://pinterest.com/pin/123/"],
    });
    const adapter = createAdapter(ctx);
    expect(adapter).toBeInstanceOf(PinterestAdapter);
  });

  test("Regular URL -> UrlAdapter", () => {
    const ctx = makeCtx({
      urls: ["https://example.com"],
    });
    const adapter = createAdapter(ctx);
    expect(adapter).toBeInstanceOf(UrlAdapter);
  });

  test("default (no input) -> UrlAdapter", () => {
    const ctx = makeCtx();
    const adapter = createAdapter(ctx);
    expect(adapter).toBeInstanceOf(UrlAdapter);
  });

  test("GitHub URL -> GitHubAdapter", () => {
    const ctx = makeCtx({
      urls: ["https://github.com/user/repo"],
    });
    const adapter = createAdapter(ctx);
    expect(adapter).toBeInstanceOf(GitHubAdapter);
    expect(adapter.type).toBe("github");
    expect(adapter.hasSourceCode).toBe(true);
    expect(adapter.category).toBe("code");
  });
});
