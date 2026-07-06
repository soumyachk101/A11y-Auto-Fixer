import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  nearestCompliantColor,
  parseColor,
  requiredRatio,
  toHex,
} from "./contrast.js";
import { computeScore } from "../services/scoring.js";
import { prioritize } from "../services/prioritizer.js";

describe("contrast math (WCAG known pairs)", () => {
  it("black on white = 21:1", () => {
    expect(contrastRatio(parseColor("#000000")!, parseColor("#ffffff")!)).toBeCloseTo(21, 1);
  });

  it("white on white = 1:1", () => {
    expect(contrastRatio(parseColor("#fff")!, parseColor("#ffffff")!)).toBeCloseTo(1, 3);
  });

  it("#777 on #fff ≈ 4.48:1 (the classic near-miss)", () => {
    expect(contrastRatio(parseColor("#777777")!, parseColor("#ffffff")!)).toBeCloseTo(4.48, 1);
  });

  it("parses rgb() strings", () => {
    expect(parseColor("rgb(255, 0, 0)")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor("rgba(0 128 255 / 0.5)")).toEqual({ r: 0, g: 128, b: 255 });
  });

  it("threshold: normal text 4.5, large text 3", () => {
    expect(requiredRatio(16, 400)).toBe(4.5);
    expect(requiredRatio(24, 400)).toBe(3);
    expect(requiredRatio(19, 700)).toBe(3);
    expect(requiredRatio(19, 400)).toBe(4.5);
  });

  it("nearestCompliantColor reaches the target and keeps direction minimal", () => {
    const fg = parseColor("#7aa7ff")!; // fails on white
    const bg = parseColor("#ffffff")!;
    const fixed = nearestCompliantColor(fg, bg, 4.5);
    expect(contrastRatio(fixed, bg)).toBeGreaterThanOrEqual(4.5);
    // Blue-ish hue preserved: blue channel stays dominant
    expect(fixed.b).toBeGreaterThan(fixed.r);
  });

  it("already-compliant color returned unchanged", () => {
    const fg = parseColor("#000000")!;
    const bg = parseColor("#ffffff")!;
    expect(toHex(nearestCompliantColor(fg, bg, 4.5))).toBe("#000000");
  });
});

describe("scoring", () => {
  it("100 with no issues", () => {
    expect(computeScore([])).toBe(0 + 100);
  });

  it("penalizes by severity: critical=10 serious=6 moderate=3 minor=1", () => {
    expect(
      computeScore([
        { severity: "critical" },
        { severity: "serious" },
        { severity: "moderate" },
        { severity: "minor" },
      ]),
    ).toBe(100 - 20);
  });

  it("floors at 0", () => {
    expect(computeScore(Array(20).fill({ severity: "critical" }))).toBe(0);
  });
});

describe("prioritizer", () => {
  it("critical alt-text outranks minor structure", () => {
    expect(prioritize("critical", "alt-text", 1)).toBeGreaterThan(prioritize("minor", "structure", 1));
  });

  it("occurrence count multiplies", () => {
    expect(prioritize("serious", "contrast", 3)).toBe(3 * 3 * 3);
  });
});
