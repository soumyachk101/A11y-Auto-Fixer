import { Router, type NextFunction, type Request, type Response } from "express";
import {
  createHtmlScan,
  createScan,
  exportScan,
  getScan,
  listIssues,
  rescan,
} from "../controllers/scanController.js";
import {
  applyFix,
  dismissIssue,
  getIssue,
  regenerateFix,
  reopenIssue,
} from "../controllers/issueController.js";
import { config } from "../config.js";
import { ApiError } from "../types/index.js";

/** Wrap async handlers so thrown ApiErrors reach the error middleware. */
type Handler = (req: Request, res: Response) => Promise<void>;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

/** Naive per-IP rate limit on scan creation (Docs/04 §6). */
const hits = new Map<string, number[]>();
function rateLimit(req: Request, _res: Response, next: NextFunction): void {
  const ip = req.ip ?? "unknown";
  const now = Date.now();
  const windowStart = now - 60_000;
  const recent = (hits.get(ip) ?? []).filter((t) => t > windowStart);
  if (recent.length >= config.scanRateLimitPerMin) {
    next(new ApiError(429, "RATE_LIMITED", "Too many scans — try again in a minute."));
    return;
  }
  recent.push(now);
  hits.set(ip, recent);
  next();
}

const startedAt = Date.now();

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0", uptimeSec: Math.floor((Date.now() - startedAt) / 1000) });
});

router.post("/scans", rateLimit, wrap(createScan));
router.post("/scans/html", rateLimit, wrap(createHtmlScan));
router.get("/scans/:id", wrap(getScan));
router.get("/scans/:id/issues", wrap(listIssues));
router.post("/scans/:id/rescan", rateLimit, wrap(rescan));
router.get("/scans/:id/export", wrap(exportScan));

router.get("/issues/:id", wrap(getIssue));
router.post("/issues/:id/fix", wrap(regenerateFix));
router.post("/issues/:id/apply", wrap(applyFix));
router.post("/issues/:id/dismiss", wrap(dismissIssue));
router.post("/issues/:id/reopen", wrap(reopenIssue));
