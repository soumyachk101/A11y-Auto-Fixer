import {
  contrastRatio,
  nearestCompliantColor,
  parseColor,
  requiredRatio,
  toHex,
} from "../../lib/contrast.js";
import type { GeneratedFix, ParsedIssue } from "../../types/index.js";

/** Deterministic WCAG contrast fix — no AI (Docs/07 §B4). */
export function generateContrastFix(issue: ParsedIssue): GeneratedFix | null {
  const data = issue.contrastData;
  if (!data) return null;

  const fg = parseColor(data.fgColor);
  const bg = parseColor(data.bgColor);
  if (!fg || !bg) return null;

  // axe reports fontSize like "12.0pt (16px)" — take the px figure.
  const pxMatch = data.fontSize?.match(/\(([\d.]+)px\)/) ?? data.fontSize?.match(/([\d.]+)px/);
  const fontSizePx = pxMatch?.[1] ? parseFloat(pxMatch[1]) : 16;
  const fontWeight = parseInt(data.fontWeight, 10) || 400;

  const target = requiredRatio(fontSizePx, fontWeight);
  const fixed = nearestCompliantColor(fg, bg, target);
  const fixedHex = toHex(fixed);
  const achieved = contrastRatio(fixed, bg);

  const selector = issue.elementSelector;
  const originalCode = `${selector} { color: ${toHex(fg).toLowerCase()}; } /* ${data.contrastRatio}:1 on ${toHex(bg).toLowerCase()} — fails ${target}:1 */`;
  const fixedCode = `${selector} { color: ${fixedHex.toLowerCase()}; } /* ${achieved.toFixed(2)}:1 on ${toHex(bg).toLowerCase()} — passes AA */`;

  return {
    fixType: "contrast",
    source: "deterministic",
    originalCode,
    fixedCode,
    explanation: `Darkened/lightened the text color to the nearest shade meeting WCAG AA (${target}:1) while staying close to the original.`,
    confidence: null,
    decorative: false,
    needsReview: false,
    srBefore: null, // contrast is a visual barrier, not a screen-reader one
    srAfter: null,
  };
}
