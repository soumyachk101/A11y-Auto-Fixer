/**
 * Seed a pre-scanned demo scan (Docs/05 §6) by running the REAL pipeline
 * against the bundled fixture — honest data, works offline, survives a dead
 * conference network. The scan lands as url "demo://sample-site".
 */
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma.js";
import { runScanJob } from "../src/services/scanJob.js";
import { closeBrowser } from "../src/services/scanEngine.js";

const html = readFileSync(new URL("../fixtures/broken-page.html", import.meta.url), "utf8");

const existing = await prisma.scan.findFirst({ where: { url: "demo://sample-site" } });
if (existing) {
  console.log(`Demo scan already seeded (${existing.id}) — deleting and re-seeding.`);
  await prisma.scan.delete({ where: { id: existing.id } });
}

const scan = await prisma.scan.create({
  data: { url: "demo://sample-site", status: "pending" },
});
await runScanJob(scan.id, { html });

const fresh = await prisma.scan.findUnique({
  where: { id: scan.id },
  include: { issues: true },
});
console.log(
  `Seeded demo scan ${scan.id}: ${fresh?.issues.length} issues, score ${fresh?.scoreBefore}.`,
);

await closeBrowser();
await prisma.$disconnect();
