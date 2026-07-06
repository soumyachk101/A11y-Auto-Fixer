/**
 * Dev utility: screenshot the running frontend (and optionally drive the demo
 * flow) so UI work can be reviewed without a browser session.
 *   npm run scan:cli — engine proof; this file — UI proof.
 *   tsx src/scripts/screenshot.ts <outDir> [--flow]
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const outDir = process.argv[2] ?? "/tmp";
const runFlow = process.argv.includes("--flow");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${outDir}/01-landing.png` });

if (runFlow) {
  // Drive a fixture scan through the real UI via the html endpoint,
  // then jump the UI to results by scanning a known URL is not possible
  // offline — so POST the fixture, then let the UI poll it.
  const html = readFileSync(new URL("../../fixtures/broken-page.html", import.meta.url), "utf8");
  const res = await page.request.post("http://localhost:4001/api/scans/html", {
    data: { html, label: "ui-proof" },
  });
  const { scanId } = (await res.json()) as { scanId: string };

  // Wait for completion, then have the UI load it by simulating the store path:
  // easiest deterministic route — reuse the app's own fetch layer via URL scan
  // isn't available, so drive the UI with the real page flow instead.
  await page.waitForTimeout(4000);

  // Render results by injecting the scan through the app store (dev-only hook).
  await page.evaluate(async (id) => {
    const [scanRes, issuesRes] = await Promise.all([
      fetch(`/api/scans/${id}`),
      fetch(`/api/scans/${id}/issues`),
    ]);
    const scan = await scanRes.json();
    const issues = (await issuesRes.json()).issues;
    // @ts-expect-error dev hook installed by the app in dev mode
    window.__accesslens_load?.(scan, issues);
  }, scanId);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/02-results.png` });

  // Open first issue
  await page.locator("[data-issue-row]").first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/03-detail.png`, fullPage: true });
}

await browser.close();
console.log(`Screenshots written to ${outDir}`);
