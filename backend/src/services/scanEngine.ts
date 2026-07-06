import { chromium, type Browser, type Page } from "playwright";
import { createRequire } from "node:module";
import { config } from "../config.js";
import { ApiError, type RawIssue, type ScanEngineResult, type Severity } from "../types/index.js";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");

// One shared headless browser — a scan is a context, not a fresh process.
let browserPromise: Promise<Browser> | null = null;
function getBrowser(): Promise<Browser> {
  browserPromise ??= chromium.launch({ headless: true });
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

/** Common WCAG 2.1 A/AA criterion names, keyed by axe tag (wcag111 → 1.1.1). */
const WCAG_NAMES: Record<string, string> = {
  "1.1.1": "Non-text Content",
  "1.3.1": "Info and Relationships",
  "1.3.4": "Orientation",
  "1.3.5": "Identify Input Purpose",
  "1.4.1": "Use of Color",
  "1.4.2": "Audio Control",
  "1.4.3": "Contrast (Minimum)",
  "1.4.4": "Resize Text",
  "1.4.10": "Reflow",
  "1.4.11": "Non-text Contrast",
  "1.4.12": "Text Spacing",
  "2.1.1": "Keyboard",
  "2.4.1": "Bypass Blocks",
  "2.4.2": "Page Titled",
  "2.4.4": "Link Purpose (In Context)",
  "2.4.6": "Headings and Labels",
  "2.4.7": "Focus Visible",
  "2.5.3": "Label in Name",
  "3.1.1": "Language of Page",
  "3.1.2": "Language of Parts",
  "3.3.2": "Labels or Instructions",
  "4.1.1": "Parsing",
  "4.1.2": "Name, Role, Value",
};

function wcagCriterionFromTags(tags: string[]): string {
  for (const tag of tags) {
    const m = tag.match(/^wcag(\d)(\d)(\d{1,2})$/);
    if (m) {
      const num = `${m[1]}.${m[2]}.${m[3]}`;
      const name = WCAG_NAMES[num];
      return name ? `${num} ${name}` : `WCAG ${num}`;
    }
  }
  return "WCAG best practice";
}

const VALID_SEVERITIES = new Set<Severity>(["critical", "serious", "moderate", "minor"]);
function toSeverity(impact: string | null | undefined): Severity {
  return VALID_SEVERITIES.has(impact as Severity) ? (impact as Severity) : "moderate";
}

interface EnrichedNode {
  selector: string;
  html: string;
  imageUrl: string | null;
  contextHtml: string | null;
  surroundingText: string | null;
}

/** Runs inside the page: resolve each selector and capture element context. */
function collectNodeContext(selectors: string[]): EnrichedNode[] {
  return selectors.map((selector) => {
    const empty: EnrichedNode = {
      selector,
      html: "",
      imageUrl: null,
      contextHtml: null,
      surroundingText: null,
    };
    let el: Element | null = null;
    try {
      el = document.querySelector(selector);
    } catch {
      return empty;
    }
    if (!el) return empty;

    let imageUrl: string | null = null;
    if (el instanceof HTMLImageElement) {
      imageUrl = el.currentSrc || el.src || null;
    } else {
      const img = el.querySelector("img");
      if (img instanceof HTMLImageElement) imageUrl = img.currentSrc || img.src || null;
    }

    const parent = el.parentElement;
    const contextHtml = parent ? parent.outerHTML.slice(0, 1500) : null;
    const surroundingText =
      (parent?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 300) || null;

    return {
      selector,
      html: el.outerHTML.slice(0, 2000),
      imageUrl,
      contextHtml,
      surroundingText,
    };
  });
}

async function runAxeOnPage(page: Page): Promise<{ rawIssues: RawIssue[]; rawAxeResults: unknown }> {
  await page.addScriptTag({ path: AXE_PATH });

  const axeResults = (await page.evaluate(() => {
    // @ts-expect-error axe is injected at runtime
    return axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
      resultTypes: ["violations"],
    });
  })) as {
    violations: Array<{
      id: string;
      impact: string | null;
      description: string;
      help: string;
      helpUrl: string;
      tags: string[];
      nodes: Array<{
        target: unknown[];
        html: string;
        impact: string | null;
        any: Array<{ id: string; data: unknown }>;
        all: Array<{ id: string; data: unknown }>;
      }>;
    }>;
  };

  const rawIssues: RawIssue[] = [];

  for (const violation of axeResults.violations) {
    const wcagCriterion = wcagCriterionFromTags(violation.tags);

    // Flatten targets (iframe targets are nested arrays — take the leaf selector).
    const selectors = violation.nodes.map((n) => {
      const t = n.target[0];
      return Array.isArray(t) ? String(t[t.length - 1]) : String(t ?? "");
    });

    const enriched = await page.evaluate(collectNodeContext, selectors);

    violation.nodes.forEach((node, i) => {
      const info = enriched[i];
      if (!info || !info.selector) return;

      const contrastCheck = [...node.any, ...node.all].find((c) =>
        c.id.startsWith("color-contrast"),
      );

      rawIssues.push({
        ruleId: violation.id,
        wcagCriterion,
        severity: toSeverity(node.impact ?? violation.impact),
        description: violation.help,
        helpUrl: violation.helpUrl,
        elementSelector: info.selector,
        elementHtml: info.html || node.html,
        imageUrl: info.imageUrl,
        contextHtml: info.contextHtml,
        surroundingText: info.surroundingText,
        contrastData: (contrastCheck?.data as RawIssue["contrastData"]) ?? null,
      });
    });
  }

  return { rawIssues, rawAxeResults: axeResults };
}

async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    acceptDownloads: false,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 AccessLens/1.0",
  });
  context.setDefaultNavigationTimeout(config.navigationTimeoutMs);
  try {
    const page = await context.newPage();
    return await fn(page);
  } finally {
    await context.close();
  }
}

/** Scan a live URL. Caller must have already run the SSRF guard. */
export async function scanUrl(url: string): Promise<ScanEngineResult> {
  return withPage(async (page) => {
    try {
      await page.goto(url, { waitUntil: "load", timeout: config.navigationTimeoutMs });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Timeout")) {
        // Page may still be usable after a slow-asset timeout — check for content.
        const hasBody = await page.evaluate(() => !!document.body?.children.length).catch(() => false);
        if (!hasBody) throw new ApiError(422, "SCAN_TIMEOUT", "The page took too long to load.");
      } else {
        throw new ApiError(422, "SCAN_UNREACHABLE", "The page could not be reached.");
      }
    }
    // Let late JS settle briefly (SPAs) without stalling on busy pages.
    await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});

    const pageTitle = await page.title();
    const pageHtml = await page.content();
    if (!pageHtml || pageHtml.length < 50) {
      throw new ApiError(422, "SCAN_UNREACHABLE", "The page rendered no content.");
    }

    const { rawIssues, rawAxeResults } = await runAxeOnPage(page);
    return { pageTitle, pageHtml, rawIssues, rawAxeResults };
  });
}

/** Scan pasted HTML (P1 fallback — Docs/04 §4). */
export async function scanHtml(html: string): Promise<ScanEngineResult> {
  return withPage(async (page) => {
    await page.setContent(html, { waitUntil: "load" });
    const pageTitle = (await page.title()) || "Pasted HTML";
    const pageHtml = await page.content();
    const { rawIssues, rawAxeResults } = await runAxeOnPage(page);
    return { pageTitle, pageHtml, rawIssues, rawAxeResults };
  });
}
