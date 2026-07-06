import { aiAvailable, callJson } from "../../lib/anthropic.js";
import type { GeneratedFix, ParsedIssue } from "../../types/index.js";

/** AI ARIA / label fix (Docs/07 §B3). */

const SYSTEM_PROMPT = `You are an accessibility expert fixing HTML to meet WCAG 2.1 and ARIA best practices.
You are given a single element that fails an accessibility rule and some surrounding DOM for context.
Rules:
- Make the SMALLEST change that fixes the accessible-name / labeling problem.
- Prefer native semantics first: a real <label> for inputs, real text for buttons/links. Use ARIA (aria-label / aria-labelledby) only when native labeling isn't possible.
- Use only valid ARIA roles, states, and properties. Never add redundant or conflicting ARIA.
- Preserve the element's existing attributes, classes, ids, and behavior. Do not restyle or restructure beyond what's needed.
- Infer a sensible accessible name from the surrounding context (nearby text, placeholder, icon meaning). Do not invent unrelated content.
Respond ONLY with minified JSON, no prose, no code fences.`;

interface AriaResult {
  fixedHtml: string;
  explanation: string;
  confidence: number;
}

/** Screen-reader role word for the SR simulation. */
function srRole(elementHtml: string): string {
  const tag = elementHtml.match(/^<\s*([a-z0-9-]+)/i)?.[1]?.toLowerCase() ?? "";
  if (tag === "a") return "link";
  if (tag === "button") return "button";
  if (tag === "select") return "combo box";
  if (tag === "textarea") return "edit text";
  if (tag === "input") {
    const type = elementHtml.match(/type\s*=\s*["']?([a-z]+)/i)?.[1]?.toLowerCase() ?? "text";
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio button";
    if (type === "submit" || type === "button") return "button";
    return "edit text";
  }
  return tag || "control";
}

/** Extract the accessible name from fixed markup (label text, aria-label, or inner text). */
function accessibleNameFrom(fixedHtml: string): string | null {
  const ariaLabel = fixedHtml.match(/aria-label\s*=\s*["']([^"']+)["']/i)?.[1];
  if (ariaLabel) return ariaLabel;
  const labelText = fixedHtml.match(/<label[^>]*>([^<]+)<\/label>/i)?.[1]?.trim();
  if (labelText) return labelText;
  const inner = fixedHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return inner || null;
}

function looksLikeHtml(s: string): boolean {
  return /^\s*</.test(s) && /<\/?[a-z]/i.test(s);
}

/** Sanity check: the fix must keep the original id/name/href attributes. */
function preservesIdentity(original: string, fixed: string): boolean {
  for (const attr of ["id", "name", "href"]) {
    const m = original.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"));
    if (m?.[1] && !fixed.includes(m[1])) return false;
  }
  return true;
}

export async function generateAriaFix(issue: ParsedIssue): Promise<GeneratedFix> {
  const role = srRole(issue.elementHtml);
  const srBefore = `unlabeled ${role}`;

  const fallback: GeneratedFix = {
    fixType: "aria-label",
    source: "ai-llm",
    originalCode: issue.elementHtml,
    fixedCode: issue.elementHtml.replace(
      /<([a-z0-9-]+)/i,
      `<$1 aria-label="TODO: describe this ${role}"`,
    ),
    explanation: "AI unavailable — placeholder label. Replace with a meaningful accessible name.",
    confidence: 0,
    decorative: false,
    needsReview: true,
    srBefore,
    srAfter: `TODO: describe this ${role}, ${role}`,
  };

  if (!aiAvailable()) return fallback;

  const userText = `Failing rule: ${issue.ruleId} — ${issue.wcagCriterion}
Element: ${issue.elementHtml}
Surrounding DOM (for context):
${issue.contextHtml ?? "(none)"}

Return JSON exactly:
{"fixedHtml": string, "explanation": string, "confidence": number between 0 and 1}
"fixedHtml" is the corrected element (and only what must change). "explanation" is one short sentence.`;

  try {
    const result = await callJson<AriaResult>({
      system: SYSTEM_PROMPT,
      content: [{ type: "text", text: userText }],
      maxTokens: 500,
      cacheParts: ["aria", issue.ruleId, issue.elementHtml, issue.contextHtml ?? ""],
    });

    const fixedHtml = String(result.fixedHtml ?? "").trim();
    if (!looksLikeHtml(fixedHtml) || !preservesIdentity(issue.elementHtml, fixedHtml)) {
      return { ...fallback, explanation: "AI produced an invalid fix — placeholder used instead." };
    }

    const confidence = Math.max(0, Math.min(1, Number(result.confidence) || 0.5));
    const name = accessibleNameFrom(fixedHtml);

    return {
      fixType: "aria-label",
      source: "ai-llm",
      originalCode: issue.elementHtml,
      fixedCode: fixedHtml,
      explanation: String(result.explanation ?? "Added an accessible name."),
      confidence,
      decorative: false,
      needsReview: confidence < 0.6,
      srBefore,
      srAfter: name ? `${name}, ${role}` : `${role}`,
    };
  } catch {
    return fallback;
  }
}
