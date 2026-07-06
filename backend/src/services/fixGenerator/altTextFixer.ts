import { aiAvailable, callJson, imageBlock, type MessageContent } from "../../lib/anthropic.js";
import { isSafeUrl } from "../../lib/ssrfGuard.js";
import type { GeneratedFix, ParsedIssue } from "../../types/index.js";

/** AI vision alt-text generation (Docs/07 §B2). */

const SYSTEM_PROMPT = `You are an accessibility expert writing alternative text (alt text) for images, following WCAG 2.1.
Rules:
- Describe the image's content and function concisely. Aim for under 125 characters.
- Do NOT start with "image of", "picture of", or "graphic of".
- Convey what matters in context; do not narrate every detail.
- If the image is purely decorative (adds no information, e.g. a divider, background flourish, or spacer), mark it decorative so it can be hidden from screen readers with alt="".
- If text appears in the image and is meaningful, include that text.
- Never invent details you cannot see. If unsure, describe only what is clearly visible and lower your confidence.
Respond ONLY with minified JSON, no prose, no code fences.`;

interface AltResult {
  alt: string;
  decorative: boolean;
  confidence: number;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // stay under the API's 5MB image cap

async function fetchImageBase64(
  url: string,
): Promise<{ data: string; mediaType: string } | null> {
  if (!(await isSafeUrl(url))) return null;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "image/*" },
    });
    if (!res.ok) return null;
    const mediaType = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0]!.trim();
    if (!mediaType.startsWith("image/") || mediaType === "image/svg+xml") return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return null;
    return { data: buf.toString("base64"), mediaType };
  } catch {
    return null;
  }
}

function insertAlt(elementHtml: string, alt: string): string {
  const escaped = alt.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  // Replace an existing empty/missing alt, else inject after the tag name.
  if (/\salt\s*=\s*(""|'')/.test(elementHtml)) {
    return elementHtml.replace(/\salt\s*=\s*(""|'')/, ` alt="${escaped}"`);
  }
  return elementHtml.replace(/<(img|area|input)(\s|\/?>)/i, `<$1 alt="${escaped}"$2`);
}

function stripLeadingImageOf(alt: string): string {
  return alt.replace(/^(an?\s+)?(image|picture|photo|graphic|photograph)\s+(of|showing|depicting)\s+/i, "").trim();
}

export async function generateAltTextFix(
  issue: ParsedIssue,
  pageTitle: string,
): Promise<GeneratedFix> {
  const filename = issue.imageUrl?.split("/").pop()?.split("?")[0] ?? "";
  const srBefore = filename ? `${filename}, image` : "image";

  const fallback: GeneratedFix = {
    fixType: "alt-text",
    source: "ai-vision",
    originalCode: issue.elementHtml,
    fixedCode: insertAlt(issue.elementHtml, "TODO: describe this image"),
    explanation: "AI unavailable — placeholder alt text. Replace with a real description.",
    confidence: 0,
    decorative: false,
    needsReview: true,
    srBefore,
    srAfter: "TODO: describe this image, image",
  };

  if (!aiAvailable()) return fallback;

  const image = issue.imageUrl ? await fetchImageBase64(issue.imageUrl) : null;

  const contextText = `Page title: "${pageTitle}"
Nearby text / caption (if any): "${issue.surroundingText ?? ""}"
Element: ${issue.elementHtml}

Write alt text for this image for the context above.${image ? "" : "\nNOTE: The image itself could not be fetched — infer cautiously from the URL and context only, and lower your confidence."}
Return JSON exactly: {"alt": string, "decorative": boolean, "confidence": number between 0 and 1}
If decorative is true, set "alt" to "".`;

  const content: MessageContent = image
    ? [imageBlock(image.data, image.mediaType), { type: "text", text: contextText }]
    : [{ type: "text", text: `Image URL: ${issue.imageUrl ?? "unknown"}\n${contextText}` }];

  try {
    const result = await callJson<AltResult>({
      system: SYSTEM_PROMPT,
      content,
      maxTokens: 300,
      cacheParts: ["alt", issue.imageUrl ?? issue.elementHtml, issue.surroundingText ?? ""],
    });

    let alt = stripLeadingImageOf(String(result.alt ?? ""));
    if (alt.length > 125) alt = `${alt.slice(0, 122)}...`;
    const decorative = Boolean(result.decorative);
    let confidence = Math.max(0, Math.min(1, Number(result.confidence) || 0.5));
    if (!image) confidence = Math.min(confidence, 0.4); // context-only guess

    const fixedCode = insertAlt(issue.elementHtml, decorative ? "" : alt);

    return {
      fixType: "alt-text",
      source: "ai-vision",
      originalCode: issue.elementHtml,
      fixedCode,
      explanation: decorative
        ? "Marked decorative (alt=\"\") so screen readers skip it — it adds no information."
        : `Generated from the actual image${image ? "" : " context"}; concise and descriptive.`,
      confidence,
      decorative,
      needsReview: confidence < 0.6,
      srBefore,
      srAfter: decorative ? "(skipped by screen reader)" : `${alt}, image`,
    };
  } catch {
    return fallback;
  }
}
