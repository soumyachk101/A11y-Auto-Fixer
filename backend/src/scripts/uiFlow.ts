/**
 * End-to-end UI proof: sample scan → results → open issue → apply fix →
 * score moves → export dialog. Screenshots each beat.
 *   tsx src/scripts/uiFlow.ts <outDir>
 */
import { chromium } from "playwright";

const outDir = process.argv[2] ?? "/tmp";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

// 1. Kick off the sample scan from the landing page
await page.getByRole("button", { name: "try a sample site" }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${outDir}/10-scanning.png` });

// 2. Wait for the dashboard
await page.getByRole("button", { name: /Apply all safe/ }).waitFor({ timeout: 30_000 });
await page.screenshot({ path: `${outDir}/11-results.png` });

// 3. Open the top issue and apply its fix
await page.locator("[data-issue-row]").first().click();
await page.waitForTimeout(400);
const applyButton = page.getByRole("button", { name: "Apply fix" });
if (await applyButton.isVisible()) {
  await applyButton.click();
  await page.waitForTimeout(900); // score count-up + toast
}
await page.screenshot({ path: `${outDir}/12-applied.png` });

// 4. Export dialog
await page.getByRole("button", { name: "Export", exact: true }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/13-export.png` });
await page.keyboard.press("Escape");

// 5. Keyboard reachability spot-check: tab from top lands on skip link
await page.keyboard.press("Tab");
const focusedText = await page.evaluate(() => document.activeElement?.textContent ?? "");
console.log(`First tab stop: "${focusedText.trim()}"`);

const score = await page.evaluate(() => {
  return document.querySelector('[role="status"]')?.getAttribute("aria-label") ?? "no score found";
});
console.log(`Score state: ${score}`);

await browser.close();
console.log(`UI flow screenshots in ${outDir}`);
