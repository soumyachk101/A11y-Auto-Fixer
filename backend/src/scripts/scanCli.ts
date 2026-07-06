/**
 * Phase-1 proof script (Docs/07 §A2.2): run the scan engine against a URL or
 * local fixture and print what it found — before any HTTP wiring.
 *
 *   npm run scan:cli -- https://example.com
 *   npm run scan:cli -- fixtures/broken-page.html
 */
import { readFileSync } from "node:fs";
import { scanUrl, scanHtml, closeBrowser } from "../services/scanEngine.js";

const target = process.argv[2] ?? "fixtures/broken-page.html";

const result = target.startsWith("http")
  ? await scanUrl(target)
  : await scanHtml(readFileSync(target, "utf8"));

console.log(`\nPage: ${result.pageTitle}`);
console.log(`HTML: ${result.pageHtml.length} bytes`);
console.log(`Violations: ${result.rawIssues.length}\n`);

for (const issue of result.rawIssues) {
  console.log(`[${issue.severity.toUpperCase()}] ${issue.ruleId} — ${issue.wcagCriterion}`);
  console.log(`  selector: ${issue.elementSelector}`);
  console.log(`  html:     ${issue.elementHtml.slice(0, 100)}`);
  if (issue.imageUrl) console.log(`  image:    ${issue.imageUrl}`);
  if (issue.contrastData) {
    console.log(
      `  contrast: ${issue.contrastData.fgColor} on ${issue.contrastData.bgColor} = ${issue.contrastData.contrastRatio}:1 (needs ${issue.contrastData.expectedContrastRatio})`,
    );
  }
  console.log();
}

await closeBrowser();
