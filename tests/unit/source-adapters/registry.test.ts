/**
 * Tests for source adapter registry — resolveSourceType, getSourceTypeLabel, isUrlOfType.
 */

import { describe, expect, test } from "bun:test";
import {
  resolveSourceType,
  getSourceTypeLabel,
  isUrlOfType,
} from "@/lib/source-adapters/registry";

describe("resolveSourceType", () => {
  test('Pinterest pin URL -> "pinterest"', () => {
    const result = resolveSourceType([
      "https://www.pinterest.com/pin/123456789/",
    ]);
    expect(result).toBe("pinterest");
  });

  test('Pinterest board URL -> "pinterest-board"', () => {
    const result = resolveSourceType([
      "https://pinterest.com/user/boards/boardname/",
    ]);
    expect(result).toBe("pinterest-board");
  });

  test("Pinterest board detected BEFORE single pin", () => {
    // A URL that contains both "boards" and pin-like segments
    // The board pattern must win since it's checked first
    const boardUrl = "https://pinterest.com/user/boards/myboard/";
    expect(resolveSourceType([boardUrl])).toBe("pinterest-board");

    // A regular pin URL should still be "pinterest"
    const pinUrl = "https://pinterest.com/pin/99887766/";
    expect(resolveSourceType([pinUrl])).toBe("pinterest");
  });

  test('Dribbble shot URL -> "dribbble"', () => {
    const result = resolveSourceType([
      "https://dribbble.com/shots/12345-awesome-design",
    ]);
    expect(result).toBe("dribbble");
  });

  test('Behance gallery URL -> "behance"', () => {
    const result = resolveSourceType([
      "https://www.behance.net/gallery/12345/Project-Title",
    ]);
    expect(result).toBe("behance");
  });

  test('CodePen URL -> "codepen"', () => {
    const result = resolveSourceType([
      "https://codepen.io/username/pen/abcdef",
    ]);
    expect(result).toBe("codepen");
  });

  test('GitHub repo URL -> "github"', () => {
    const result = resolveSourceType([
      "https://github.com/user/repo",
    ]);
    expect(result).toBe("github");
  });

  test('Regular URL -> "url"', () => {
    const result = resolveSourceType(["https://example.com/some-page"]);
    expect(result).toBe("url");
  });

  test('Direct image URL (.png) -> "image"', () => {
    const result = resolveSourceType([
      "https://example.com/photo.png",
    ]);
    expect(result).toBe("image");
  });

  test('Direct image URL (.jpg) -> "image"', () => {
    const result = resolveSourceType([
      "https://cdn.example.com/img.jpg",
    ]);
    expect(result).toBe("image");
  });

  test('Direct image URL (.webp) -> "image"', () => {
    const result = resolveSourceType([
      "https://cdn.example.com/img.webp",
    ]);
    expect(result).toBe("image");
  });

  test('Image base64 present -> "image" regardless of URLs', () => {
    // Even with a pinterest URL, if base64 is present, it's an image
    const result = resolveSourceType(
      ["https://pinterest.com/pin/123/"],
      "iVBORw0KGgoAAAANSUhEUg==",
    );
    expect(result).toBe("image");
  });

  test('Empty input -> "url"', () => {
    const result = resolveSourceType([]);
    expect(result).toBe("url");
  });

  test("empty string URL falls back to url", () => {
    const result = resolveSourceType([""]);
    expect(result).toBe("url");
  });
});

describe("getSourceTypeLabel", () => {
  const cases: Array<[string, string]> = [
    ["url", "Web Page"],
    ["image", "Image"],
    ["pinterest", "Pinterest Pin"],
    ["pinterest-board", "Pinterest Board"],
    ["dribbble", "Dribbble Shot"],
    ["behance", "Behance Project"],
    ["codepen", "CodePen"],
    ["github", "GitHub Repository"],
  ];

  for (const [type, expectedLabel] of cases) {
    test(`${type} -> "${expectedLabel}"`, () => {
      expect(getSourceTypeLabel(type as any)).toBe(expectedLabel);
    });
  }
});

describe("isUrlOfType", () => {
  test("pinterest.com URL is of type pinterest", () => {
    expect(
      isUrlOfType("https://www.pinterest.com/pin/123/", "pinterest"),
    ).toBe(true);
  });

  test("pinterest.com URL is not of type dribbble", () => {
    expect(
      isUrlOfType("https://www.pinterest.com/pin/123/", "dribbble"),
    ).toBe(false);
  });

  test("dribbble.com/shots URL is of type dribbble", () => {
    expect(
      isUrlOfType("https://dribbble.com/shots/123", "dribbble"),
    ).toBe(true);
  });

  test("dribbble.com URL is not of type pinterest", () => {
    expect(
      isUrlOfType("https://dribbble.com/shots/123", "pinterest"),
    ).toBe(false);
  });

  test("github.com/user/repo URL is of type github", () => {
    expect(
      isUrlOfType("https://github.com/user/repo", "github"),
    ).toBe(true);
  });

  test("github.com URL is not of type codepen", () => {
    expect(
      isUrlOfType("https://github.com/user/repo", "codepen"),
    ).toBe(false);
  });

  test("codepen.io URL is of type codepen", () => {
    expect(
      isUrlOfType("https://codepen.io/user/pen/abc", "codepen"),
    ).toBe(true);
  });

  test("behance.net/gallery URL is of type behance", () => {
    expect(
      isUrlOfType("https://behance.net/gallery/123/project", "behance"),
    ).toBe(true);
  });

  test("regular URL is not of type pinterest", () => {
    expect(isUrlOfType("https://example.com/page", "pinterest")).toBe(false);
  });

  test("pinterest board URL is of type pinterest-board, not pinterest", () => {
    const boardUrl = "https://pinterest.com/user/boards/myboard/";
    expect(isUrlOfType(boardUrl, "pinterest-board")).toBe(true);
    // Note: the pin pattern also matches board URLs, but isUrlOfType
    // uses detectUrlType which returns the first match (board first)
    expect(isUrlOfType(boardUrl, "pinterest")).toBe(false);
  });
});
