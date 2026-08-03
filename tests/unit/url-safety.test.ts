import { describe, it, expect } from "vitest";
import { isImageUrlSafe } from "@/lib/url-safety";

describe("isImageUrlSafe", () => {
  it("returns true for valid https image URL", () => {
    expect(isImageUrlSafe("https://example.com/image.png")).toBe(true);
  });

  it("returns false for localhost", () => {
    expect(isImageUrlSafe("http://localhost/image.png")).toBe(false);
  });

  it("returns false for invalid URL format", () => {
    expect(isImageUrlSafe("not-a-url")).toBe(false);
  });

  it("returns false for ftp protocol", () => {
    expect(isImageUrlSafe("ftp://example.com/image.png")).toBe(false);
  });

  it("returns false for metadata.google.internal endpoint", () => {
    expect(isImageUrlSafe("http://metadata.google.internal/image.png")).toBe(false);
  });

  it("returns false for .internal host", () => {
    expect(isImageUrlSafe("http://my-service.internal/image.png")).toBe(false);
  });
});
