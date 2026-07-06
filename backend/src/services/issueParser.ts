import type { FixType, ParsedIssue, RawIssue } from "../types/index.js";
import { prioritize } from "./prioritizer.js";

/** Map axe rule ids → fix categories (Docs/01 §7, Docs/02 §3.2). */
const RULE_CATEGORY: Record<string, FixType> = {
  "image-alt": "alt-text",
  "role-img-alt": "alt-text",
  "svg-img-alt": "alt-text",
  "input-image-alt": "alt-text",
  "area-alt": "alt-text",
  "object-alt": "alt-text",
  label: "aria-label",
  "select-name": "aria-label",
  "button-name": "aria-label",
  "link-name": "aria-label",
  "input-button-name": "aria-label",
  "aria-input-field-name": "aria-label",
  "aria-command-name": "aria-label",
  "aria-toggle-field-name": "aria-label",
  "frame-title": "aria-label",
  "color-contrast": "contrast",
  "color-contrast-enhanced": "contrast",
  "html-has-lang": "lang",
  "html-lang-valid": "lang",
  "heading-order": "structure",
  region: "structure",
  "landmark-one-main": "structure",
  "page-has-heading-one": "structure",
  bypass: "structure",
  "empty-heading": "structure",
};

export function categorize(ruleId: string): FixType {
  return RULE_CATEGORY[ruleId] ?? "other";
}

/**
 * Convert raw axe violations into prioritized internal issues.
 * Also scrubs fields that only make sense for certain categories
 * (e.g. imageUrl belongs to alt-text issues only).
 */
export function parseIssues(rawIssues: RawIssue[]): ParsedIssue[] {
  const occurrences = new Map<string, number>();
  for (const raw of rawIssues) {
    occurrences.set(raw.ruleId, (occurrences.get(raw.ruleId) ?? 0) + 1);
  }

  const parsed: ParsedIssue[] = rawIssues.map((raw) => {
    const category = categorize(raw.ruleId);
    return {
      ...raw,
      imageUrl: category === "alt-text" ? raw.imageUrl : null,
      contrastData: category === "contrast" ? raw.contrastData : null,
      category,
      impactScore: prioritize(raw.severity, category, occurrences.get(raw.ruleId) ?? 1),
    };
  });

  return parsed.sort((a, b) => b.impactScore - a.impactScore);
}
