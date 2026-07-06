import { SEVERITY_PENALTY } from "../config.js";
import { prisma } from "../lib/prisma.js";

/**
 * Accessibility score 0-100 (Docs/05 §4):
 *   score = max(0, 100 - sum(severityPenalty over OPEN issues))
 * "critical issues cost 10 points each" — explainable in the demo.
 */
export function computeScore(openIssues: Array<{ severity: string }>): number {
  const penalty = openIssues.reduce(
    (sum, issue) => sum + (SEVERITY_PENALTY[issue.severity] ?? 1),
    0,
  );
  return Math.max(0, 100 - penalty);
}

/** Recompute scoreAfter from currently-open (detected) issues and persist it. */
export async function recomputeScoreAfter(scanId: string): Promise<number> {
  const open = await prisma.issue.findMany({
    where: { scanId, status: "detected" },
    select: { severity: true },
  });
  const score = computeScore(open);
  await prisma.scan.update({ where: { id: scanId }, data: { scoreAfter: score } });
  return score;
}
