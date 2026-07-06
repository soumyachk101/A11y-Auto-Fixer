import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { publish } from "../lib/wsHub.js";
import { ApiError, type ParsedIssue, type ScanEngineResult } from "../types/index.js";
import { generateFix, isAutoFixable } from "./fixGenerator/index.js";
import { parseIssues } from "./issueParser.js";
import { scanHtml, scanUrl } from "./scanEngine.js";
import { computeScore } from "./scoring.js";

/**
 * The async scan pipeline (Docs/02 §4):
 * rendering → scanning → analyzing → fixing → complete, with WS progress
 * at every stage. In-process job — one scan is one promise chain.
 */

async function setStatus(scanId: string, status: string): Promise<void> {
  await prisma.scan.update({ where: { id: scanId }, data: { status } });
}

export async function runScanJob(scanId: string, target: { url?: string; html?: string }): Promise<void> {
  try {
    // Stage: rendering + scanning (the engine does both in one pass;
    // we surface them as separate stages around the axe run).
    await setStatus(scanId, "rendering");
    publish(scanId, { stage: "rendering" });

    let result: ScanEngineResult;
    if (target.html) {
      result = await scanHtml(target.html);
    } else if (target.url) {
      result = await scanUrl(target.url);
    } else {
      throw new ApiError(400, "INVALID_URL", "Nothing to scan.");
    }

    await setStatus(scanId, "scanning");
    publish(scanId, { stage: "scanning" });

    // Stage: analyzing — parse, prioritize, persist
    const issues = parseIssues(result.rawIssues);
    await setStatus(scanId, "analyzing");
    publish(scanId, { stage: "analyzing", issueCount: issues.length });

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        pageTitle: result.pageTitle,
        pageHtml: result.pageHtml,
        rawAxeResults: JSON.stringify(result.rawAxeResults).slice(0, 2_000_000),
      },
    });

    const issueRows = await Promise.all(
      issues.map((issue) =>
        prisma.issue.create({
          data: {
            scanId,
            ruleId: issue.ruleId,
            wcagCriterion: issue.wcagCriterion,
            severity: issue.severity,
            category: issue.category,
            impactScore: issue.impactScore,
            description: issue.description,
            helpUrl: issue.helpUrl,
            elementSelector: issue.elementSelector,
            elementHtml: issue.elementHtml,
            imageUrl: issue.imageUrl,
            contextHtml: issue.contextHtml,
            contrastData: issue.contrastData ? JSON.stringify(issue.contrastData) : null,
          },
        }),
      ),
    );

    // Stage: fixing — deterministic first (instant), then AI, bounded by MAX_AI_FIXES.
    await setStatus(scanId, "fixing");
    const fixable = issues
      .map((issue, i) => ({ issue, rowId: issueRows[i]!.id }))
      .filter(({ issue }) => isAutoFixable(issue.category));

    const deterministic = fixable.filter(({ issue }) =>
      ["contrast", "lang", "structure"].includes(issue.category),
    );
    const aiFixes = fixable
      .filter(({ issue }) => ["alt-text", "aria-label"].includes(issue.category))
      .slice(0, config.maxAiFixes); // bound AI cost; remaining issues stay detected

    const total = deterministic.length + aiFixes.length;
    let done = 0;
    publish(scanId, { stage: "fixing", done, total });

    const persistFix = async (rowId: string, issue: ParsedIssue) => {
      const fix = await generateFix(issue, result.pageTitle);
      if (fix) {
        await prisma.fix.create({
          data: {
            issueId: rowId,
            fixType: fix.fixType,
            source: fix.source,
            originalCode: fix.originalCode,
            fixedCode: fix.fixedCode,
            explanation: fix.explanation,
            confidence: fix.confidence,
            decorative: fix.decorative,
            needsReview: fix.needsReview,
            srBefore: fix.srBefore,
            srAfter: fix.srAfter,
          },
        });
      }
      done++;
      publish(scanId, { stage: "fixing", done, total });
    };

    // Deterministic fixes: sequential is fine, they're microseconds each.
    for (const { issue, rowId } of deterministic) await persistFix(rowId, issue);
    // AI fixes: concurrent — the anthropic wrapper enforces the concurrency cap.
    await Promise.all(aiFixes.map(({ issue, rowId }) => persistFix(rowId, issue)));

    // Complete — scoreBefore counts every issue as open.
    const scoreBefore = computeScore(issues);
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "complete",
        scoreBefore,
        scoreAfter: scoreBefore,
        completedAt: new Date(),
      },
    });
    publish(scanId, { stage: "complete", scoreBefore });
  } catch (err) {
    const code = err instanceof ApiError ? err.code : "INTERNAL";
    const message =
      err instanceof ApiError ? err.message : "Something went wrong while scanning.";
    console.error(`[scanJob ${scanId}] failed:`, err);
    await prisma.scan
      .update({
        where: { id: scanId },
        data: { status: "failed", errorCode: code, errorMessage: message, completedAt: new Date() },
      })
      .catch(() => {});
    publish(scanId, { stage: "failed", code, message });
  }
}
