import type { GeneratedFix, ParsedIssue } from "../../types/index.js";
import { generateAltTextFix } from "./altTextFixer.js";
import { generateAriaFix } from "./ariaFixer.js";
import { generateContrastFix } from "./contrastFixer.js";
import { generateLangFix, generateStructureFix } from "./ruleFixers.js";

/**
 * Strategy dispatcher (Docs/02 §3.4). Deterministic-first: contrast/lang/structure
 * are instant local code; only alt-text and aria hit the AI.
 * Returns null when a category has no auto-fix (issue stays detection-only).
 */
export async function generateFix(
  issue: ParsedIssue,
  pageTitle: string,
): Promise<GeneratedFix | null> {
  try {
    switch (issue.category) {
      case "contrast":
        return generateContrastFix(issue);
      case "lang":
        return generateLangFix(issue);
      case "structure":
        return generateStructureFix(issue);
      case "alt-text":
        return await generateAltTextFix(issue, pageTitle);
      case "aria-label":
        return await generateAriaFix(issue);
      default:
        return null;
    }
  } catch (err) {
    // A fix failure must never crash the scan — degrade to detection-only.
    console.error(`[fixGenerator] ${issue.ruleId} (${issue.elementSelector}):`, err);
    return null;
  }
}

/** True when the category has an auto-fix strategy at all. */
export function isAutoFixable(category: string): boolean {
  return ["contrast", "lang", "structure", "alt-text", "aria-label"].includes(category);
}
