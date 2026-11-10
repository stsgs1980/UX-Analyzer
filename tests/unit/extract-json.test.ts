import { describe, it, expect } from "vitest";
import { extractJson, repairTruncatedJson, parseJsonWithRepair } from "@/lib/extract-json";

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

describe("repairTruncatedJson", () => {
  it("closes an unterminated string and the open brackets", () => {
    const truncated = '{"teardown":{"title":"Linear"},"audit":{"problems":[{"area":"UI"';
    const repaired = repairTruncatedJson(truncated);
    expect(repaired).not.toBeNull();
    const parsed = JSON.parse(repaired!);
    expect(parsed.teardown.title).toBe("Linear");
    expect(parsed.audit.problems[0].area).toBe("UI");
  });

  it("returns null for a complete JSON document", () => {
    expect(repairTruncatedJson('{"key":"value"}')).toBeNull();
  });

  it("drops a trailing escape before closing the string", () => {
    const repaired = repairTruncatedJson('{"text":"value\\');
    expect(repaired).not.toBeNull();
    expect(JSON.parse(repaired!).text).toBe("value");
  });
});

describe("parseJsonWithRepair", () => {
  it("parses valid JSON without repair", () => {
    const result = parseJsonWithRepair('{"teardown":{"title":"Linear"}}');
    expect(result.repaired).toBe(false);
    expect(result.data?.teardown).toEqual({ title: "Linear" });
  });

  it("repairs a response cut off by the token limit", () => {
    const cut = '{"type":"single","teardown":{"title":"Linear"},"heuristicEvaluation":{"scores":[{"heuristic":"Visibility","score":3,"observations":"Docs link avail';
    const result = parseJsonWithRepair(cut);
    expect(result.repaired).toBe(true);
    expect(result.data?.teardown).toEqual({ title: "Linear" });
  });

  it("returns null when the text cannot be repaired", () => {
    expect(parseJsonWithRepair("not json at all").data).toBeNull();
  });
});
