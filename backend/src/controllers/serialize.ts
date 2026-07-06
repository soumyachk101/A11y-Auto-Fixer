import type { Issue, Fix, Scan } from "@prisma/client";

/** Shape DB rows into the exact API responses of Docs/04-backend-schema.md. */

export function serializeFix(fix: Fix) {
  return {
    id: fix.id,
    fixType: fix.fixType,
    source: fix.source,
    originalCode: fix.originalCode,
    fixedCode: fix.fixedCode,
    explanation: fix.explanation,
    confidence: fix.confidence,
    decorative: fix.decorative,
    needsReview: fix.needsReview,
  };
}

export function serializeIssue(issue: Issue & { fix: Fix | null }) {
  return {
    id: issue.id,
    ruleId: issue.ruleId,
    wcagCriterion: issue.wcagCriterion,
    severity: issue.severity,
    category: issue.category,
    impactScore: issue.impactScore,
    status: issue.status,
    description: issue.description,
    helpUrl: issue.helpUrl,
    element: {
      selector: issue.elementSelector,
      html: issue.elementHtml,
      imageUrl: issue.imageUrl,
    },
    fix: issue.fix ? serializeFix(issue.fix) : null,
    screenReader:
      issue.fix?.srBefore || issue.fix?.srAfter
        ? { before: issue.fix.srBefore, after: issue.fix.srAfter }
        : null,
  };
}

export function serializeScan(
  scan: Scan,
  counts: {
    total: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    autoFixable: number;
  },
) {
  return {
    id: scan.id,
    url: scan.url,
    pageTitle: scan.pageTitle,
    status: scan.status,
    scoreBefore: scan.scoreBefore,
    scoreAfter: scan.scoreAfter,
    counts,
    error: scan.errorCode ? { code: scan.errorCode, message: scan.errorMessage } : null,
    startedAt: scan.startedAt.toISOString(),
    completedAt: scan.completedAt?.toISOString() ?? null,
  };
}
