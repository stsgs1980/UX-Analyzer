import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows first request from IP", () => {
    const result = checkRateLimit("1.2.3.4");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("allows up to 5 requests", () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("5.6.7.8");
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks 6th request from same IP", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("9.10.11.12");
    const result = checkRateLimit("9.10.11.12");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("different IPs have independent counters", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("10.0.0.1");
    const result = checkRateLimit("10.0.0.2");
    expect(result.allowed).toBe(true);
  });
});
