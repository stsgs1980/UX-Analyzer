import { describe, it, expect } from "vitest";
import { extractJson } from "@/lib/extract-json";

describe("extractJson", () => {
  it("returns clean JSON as-is", () => {
    const input = '{"key": "value"}';
    expect(extractJson(input)).toBe('{"key": "value"}');
  });

  it("extracts JSON from ```json block", () => {
    const input = 'Some text\n```json\n{"key": "value"}\n```\nMore text';
    expect(extractJson(input)).toBe('{"key": "value"}');
  });

  it("extracts JSON from ``` block without language tag", () => {
    const input = 'Prefix\n```\n{"key": "value"}\n```\nSuffix';
    expect(extractJson(input)).toBe('{"key": "value"}');
  });

  it("trims text before and after JSON object", () => {
    const input = 'Here is the result: {"key": "value"} done.';
    expect(extractJson(input)).toBe('{"key": "value"}');
  });

  it("returns original string when no braces found", () => {
    const input = "No JSON here";
    expect(extractJson(input)).toBe("No JSON here");
  });

  it("returns empty string for empty input", () => {
    expect(extractJson("")).toBe("");
  });

  it("trims whitespace-only input", () => {
    expect(extractJson("   ")).toBe("");
  });
});
