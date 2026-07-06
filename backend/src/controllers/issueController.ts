import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { generateFix } from "../services/fixGenerator/index.js";
import { recomputeScoreAfter } from "../services/scoring.js";
import { categorize } from "../services/issueParser.js";
import { ApiError, type ContrastData } from "../types/index.js";
import { serializeFix, serializeIssue } from "./serialize.js";

async function getIssueOr404(id: string) {
  const issue = await prisma.issue.findUnique({ where: { id }, include: { fix: true, scan: true } });
  if (!issue) throw new ApiError(404, "NOT_FOUND", "Issue not found.");
  return issue;
}

export async function getIssue(req: Request, res: Response): Promise<void> {
  const issue = await getIssueOr404(req.params.id as string);
  res.json(serializeIssue(issue));
}

async function setStatus(req: Request, res: Response, status: string): Promise<void> {
  const issue = await getIssueOr404(req.params.id as string);
  await prisma.issue.update({ where: { id: issue.id }, data: { status } });
  if (issue.fix) {
    await prisma.fix.update({
      where: { id: issue.fix.id },
      data: { appliedAt: status === "fixed" ? new Date() : null },
    });
  }
  const scoreAfter = await recomputeScoreAfter(issue.scanId);
  res.json({ issue: { id: issue.id, status }, scoreAfter });
}

export async function applyFix(req: Request, res: Response): Promise<void> {
  const issue = await getIssueOr404(req.params.id as string);
  if (!issue.fix) throw new ApiError(422, "FIX_FAILED", "This issue has no generated fix to apply.");
  await setStatus(req, res, "fixed");
}

export async function dismissIssue(req: Request, res: Response): Promise<void> {
  await setStatus(req, res, "dismissed");
}

export async function reopenIssue(req: Request, res: Response): Promise<void> {
  await setStatus(req, res, "detected");
}

/** (Re)generate a fix — Docs/04 §3. */
export async function regenerateFix(req: Request, res: Response): Promise<void> {
  const issue = await getIssueOr404(req.params.id as string);
  const hint = typeof req.body?.hint === "string" ? req.body.hint.slice(0, 300) : null;

  const category = categorize(issue.ruleId);
  const parsed = {
    ruleId: issue.ruleId,
    wcagCriterion: issue.wcagCriterion,
    severity: issue.severity as never,
    description: issue.description,
    helpUrl: issue.helpUrl ?? "",
    elementSelector: issue.elementSelector,
    elementHtml: issue.elementHtml,
    imageUrl: issue.imageUrl,
    contextHtml: hint
      ? `${issue.contextHtml ?? ""}\nUser hint: ${hint}`
      : issue.contextHtml,
    surroundingText: hint ?? null,
    contrastData: issue.contrastData ? (JSON.parse(issue.contrastData) as ContrastData) : null,
    category,
    impactScore: issue.impactScore,
  };

  const fix = await generateFix(parsed, issue.scan.pageTitle ?? "");
  if (!fix) throw new ApiError(422, "FIX_FAILED", "This issue type can't be auto-fixed.");

  const saved = await prisma.fix.upsert({
    where: { issueId: issue.id },
    create: {
      issueId: issue.id,
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
    update: {
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
      appliedAt: null,
    },
  });

  res.json({ issueId: issue.id, fix: serializeFix(saved) });
}
