import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { assertSafeUrl } from "../lib/ssrfGuard.js";
import { runScanJob } from "../services/scanJob.js";
import { buildPatchedHtml } from "../services/exporter.js";
import { ApiError } from "../types/index.js";
import { serializeIssue, serializeScan } from "./serialize.js";

const createScanSchema = z.object({ url: z.string().min(1).max(2048) });
const createHtmlScanSchema = z.object({
  html: z.string().min(20).max(2_000_000),
  label: z.string().max(200).optional(),
});

export async function createScan(req: Request, res: Response): Promise<void> {
  const body = createScanSchema.safeParse(req.body);
  if (!body.success) throw new ApiError(400, "INVALID_URL", "Provide a url to scan.");

  let raw = body.data.url.trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  const url = await assertSafeUrl(raw); // SSRF guard BEFORE creating the scan record

  const scan = await prisma.scan.create({ data: { url: url.href, status: "pending" } });
  void runScanJob(scan.id, { url: url.href });

  res.status(202).json({
    scanId: scan.id,
    status: "pending",
    url: url.href,
    wsUrl: `/ws/scans/${scan.id}`,
  });
}

/** P1 fallback — scan pasted HTML (Docs/04 §4). */
export async function createHtmlScan(req: Request, res: Response): Promise<void> {
  const body = createHtmlScanSchema.safeParse(req.body);
  if (!body.success) throw new ApiError(400, "INVALID_URL", "Provide an html string to scan.");

  const label = body.data.label ?? "pasted snippet";
  const scan = await prisma.scan.create({
    data: { url: `html://${label}`, status: "pending" },
  });
  void runScanJob(scan.id, { html: body.data.html });

  res.status(202).json({
    scanId: scan.id,
    status: "pending",
    url: `html://${label}`,
    wsUrl: `/ws/scans/${scan.id}`,
  });
}

async function getScanOr404(id: string) {
  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) throw new ApiError(404, "NOT_FOUND", "Scan not found.");
  return scan;
}

export async function getScan(req: Request, res: Response): Promise<void> {
  const scan = await getScanOr404(req.params.id as string);
  const issues = await prisma.issue.findMany({
    where: { scanId: scan.id },
    include: { fix: true },
  });

  const byStatus: Record<string, number> = { detected: 0, fixed: 0, dismissed: 0 };
  const bySeverity: Record<string, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  let autoFixable = 0;
  for (const issue of issues) {
    byStatus[issue.status] = (byStatus[issue.status] ?? 0) + 1;
    bySeverity[issue.severity] = (bySeverity[issue.severity] ?? 0) + 1;
    if (issue.fix) autoFixable++;
  }

  res.json(serializeScan(scan, { total: issues.length, byStatus, bySeverity, autoFixable }));
}

export async function listIssues(req: Request, res: Response): Promise<void> {
  const scan = await getScanOr404(req.params.id as string);

  const { severity, category, status, limit, offset } = req.query;
  const where: Record<string, unknown> = { scanId: scan.id };
  if (typeof severity === "string" && severity) where.severity = severity;
  if (typeof category === "string" && category) where.category = category;
  if (typeof status === "string" && status) where.status = status;

  const [total, issues] = await Promise.all([
    prisma.issue.count({ where: { scanId: scan.id } }),
    prisma.issue.findMany({
      where,
      include: { fix: true },
      orderBy: { impactScore: "desc" },
      take: Math.min(Number(limit) || 500, 500),
      skip: Number(offset) || 0,
    }),
  ]);

  res.json({ scanId: scan.id, total, issues: issues.map(serializeIssue) });
}

export async function rescan(req: Request, res: Response): Promise<void> {
  const prior = await getScanOr404(req.params.id as string);
  if (prior.url.startsWith("html://")) {
    throw new ApiError(400, "INVALID_URL", "Pasted-HTML scans can't be re-run — submit the HTML again.");
  }
  const url = await assertSafeUrl(prior.url);
  const scan = await prisma.scan.create({ data: { url: url.href, status: "pending" } });
  void runScanJob(scan.id, { url: url.href });
  res.status(202).json({
    scanId: scan.id,
    status: "pending",
    url: url.href,
    wsUrl: `/ws/scans/${scan.id}`,
  });
}

export async function exportScan(req: Request, res: Response): Promise<void> {
  const scan = await getScanOr404(req.params.id as string);
  const format = String(req.query.format ?? "html");

  if (format === "html") {
    const html = await buildPatchedHtml(scan.id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="accesslens-patched-${scan.id}.html"`,
    );
    res.send(html);
    return;
  }

  if (format === "json") {
    const issues = await prisma.issue.findMany({
      where: { scanId: scan.id },
      include: { fix: true },
      orderBy: { impactScore: "desc" },
    });
    const byStatus: Record<string, number> = { detected: 0, fixed: 0, dismissed: 0 };
    const bySeverity: Record<string, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    let autoFixable = 0;
    for (const issue of issues) {
      byStatus[issue.status] = (byStatus[issue.status] ?? 0) + 1;
      bySeverity[issue.severity] = (bySeverity[issue.severity] ?? 0) + 1;
      if (issue.fix) autoFixable++;
    }
    res.json({
      scan: serializeScan(scan, { total: issues.length, byStatus, bySeverity, autoFixable }),
      issues: issues.map(serializeIssue),
    });
    return;
  }

  throw new ApiError(400, "INVALID_URL", `Unknown export format "${format}". Use html or json.`);
}
