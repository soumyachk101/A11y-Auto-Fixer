import type { GeneratedFix, ParsedIssue } from "../../types/index.js";

/** Rule-based fixers — lang + structure. Instant, no AI (Docs/01 §7). */

export function generateLangFix(issue: ParsedIssue): GeneratedFix {
  const openTag = issue.elementHtml.match(/<html[^>]*>/i)?.[0] ?? "<html>";
  const fixedTag = /lang\s*=/i.test(openTag)
    ? openTag.replace(/lang\s*=\s*["'][^"']*["']/i, 'lang="en"')
    : openTag.replace(/<html/i, '<html lang="en"');

  return {
    fixType: "lang",
    source: "deterministic",
    originalCode: openTag,
    fixedCode: fixedTag,
    explanation:
      'Added lang="en" so screen readers use the correct pronunciation rules. Change "en" if the page is in another language.',
    confidence: null,
    decorative: false,
    needsReview: false,
    srBefore: null,
    srAfter: null,
  };
}

export function generateStructureFix(issue: ParsedIssue): GeneratedFix | null {
  const base = {
    fixType: "structure" as const,
    source: "deterministic" as const,
    originalCode: issue.elementHtml,
    confidence: null,
    decorative: false,
    needsReview: false,
    srBefore: null,
    srAfter: null,
  };

  switch (issue.ruleId) {
    case "heading-order": {
      const current = issue.elementHtml.match(/^<h([1-6])/i)?.[1];
      if (!current) return null;
      // Suggest stepping down one level at a time from wherever the jump landed.
      const suggested = Math.max(2, Number(current) - 1);
      const fixedCode = issue.elementHtml
        .replace(new RegExp(`^<h${current}`, "i"), `<h${suggested}`)
        .replace(new RegExp(`</h${current}>`, "i"), `</h${suggested}>`);
      return {
        ...base,
        fixedCode,
        explanation: `Heading levels should not skip (h${suggested} expected here). Screen-reader users navigate by heading hierarchy.`,
      };
    }
    case "region": {
      return {
        ...base,
        fixedCode: `<main>\n  ${issue.elementHtml}\n</main>`,
        explanation:
          "Wrapped in a <main> landmark so assistive-tech users can jump straight to the content. Use <header>/<nav>/<footer> for those areas instead where appropriate.",
      };
    }
    case "landmark-one-main": {
      return {
        ...base,
        fixedCode: `<main>\n  <!-- primary page content -->\n</main>`,
        explanation: "Added a single <main> landmark identifying the page's primary content.",
      };
    }
    case "page-has-heading-one": {
      return {
        ...base,
        fixedCode: `<h1><!-- page title --></h1>`,
        explanation: "Added an <h1> so the page has a top-level heading to anchor navigation.",
      };
    }
    case "bypass": {
      return {
        ...base,
        fixedCode: `<a href="#main-content" class="skip-link">Skip to main content</a>\n${issue.elementHtml}`,
        explanation: "Added a skip link so keyboard users can bypass repeated navigation.",
      };
    }
    default:
      return null;
  }
}
