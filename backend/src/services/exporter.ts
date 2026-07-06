import * as cheerio from "cheerio";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../types/index.js";

/**
 * Patched-HTML export (Docs/04 §2): original rendered HTML with every APPLIED
 * fix merged in. Element fixes are swapped in via the stored CSS selector;
 * contrast fixes are injected as a <style> override block (computed styles
 * can't be reliably patched inline).
 */

interface AppliedFix {
  category: string;
  selector: string;
  fixedCode: string;
  decorative: boolean;
}

export async function buildPatchedHtml(scanId: string): Promise<string> {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { issues: { where: { status: "fixed" }, include: { fix: true } } },
  });
  if (!scan) throw new ApiError(404, "NOT_FOUND", "Scan not found.");
  if (!scan.pageHtml) throw new ApiError(404, "NOT_FOUND", "No page snapshot stored for this scan.");

  const fixes: AppliedFix[] = scan.issues
    .filter((i) => i.fix)
    .map((i) => ({
      category: i.category,
      selector: i.elementSelector,
      fixedCode: i.fix!.fixedCode,
      decorative: i.fix!.decorative,
    }));

  const $ = cheerio.load(scan.pageHtml);
  const contrastRules: string[] = [];

  for (const fix of fixes) {
    switch (fix.category) {
      case "contrast": {
        // fixedCode is a CSS rule string — collect into one override block.
        contrastRules.push(fix.fixedCode);
        break;
      }
      case "lang": {
        const lang = fix.fixedCode.match(/lang\s*=\s*["']([^"']+)["']/i)?.[1] ?? "en";
        $("html").attr("lang", lang);
        break;
      }
      case "alt-text":
      case "aria-label":
      case "structure": {
        try {
          const el = $(fix.selector).first();
          if (el.length) el.replaceWith(fix.fixedCode);
        } catch {
          // Selector didn't resolve against the snapshot — skip, never break export.
        }
        break;
      }
    }
  }

  if (contrastRules.length) {
    $("head").append(
      `\n<style id="accesslens-contrast-fixes">\n/* AccessLens — WCAG AA contrast overrides */\n${contrastRules.join("\n")}\n</style>\n`,
    );
  }

  $("head").prepend(`\n<!-- Patched by AccessLens: ${fixes.length} applied fix(es) -->\n`);
  return $.html();
}
