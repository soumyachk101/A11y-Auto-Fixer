// Shared domain types — string unions match Docs/04-backend-schema.md enums exactly.

export type ScanStatus =
  | "pending"
  | "rendering"
  | "scanning"
  | "analyzing"
  | "fixing"
  | "complete"
  | "failed";

export type Severity = "critical" | "serious" | "moderate" | "minor";

export type FixType = "alt-text" | "aria-label" | "contrast" | "structure" | "lang" | "other";

export type IssueStatus = "detected" | "fixed" | "dismissed";

export type FixSource = "ai-vision" | "ai-llm" | "deterministic";

export type ErrorCode =
  | "INVALID_URL"
  | "BLOCKED_URL"
  | "SCAN_UNREACHABLE"
  | "SCAN_TIMEOUT"
  | "NOT_FOUND"
  | "FIX_FAILED"
  | "RATE_LIMITED"
  | "INTERNAL";

/** Contrast data captured from axe's color-contrast check. */
export interface ContrastData {
  fgColor: string;
  bgColor: string;
  fontSize: string;
  fontWeight: string;
  expectedContrastRatio: string;
  contrastRatio: number;
}

/** One violation node enriched by the scan engine. */
export interface RawIssue {
  ruleId: string;
  wcagCriterion: string;
  severity: Severity;
  description: string;
  helpUrl: string;
  elementSelector: string;
  elementHtml: string;
  imageUrl: string | null;
  contextHtml: string | null;
  surroundingText: string | null;
  contrastData: ContrastData | null;
}

export interface ScanEngineResult {
  pageTitle: string;
  pageHtml: string;
  rawIssues: RawIssue[];
  rawAxeResults: unknown;
}

export interface ParsedIssue extends RawIssue {
  category: FixType;
  impactScore: number;
}

/** Normalized fix — Docs/07 §B5 output contract. */
export interface GeneratedFix {
  fixType: FixType;
  source: FixSource;
  originalCode: string;
  fixedCode: string;
  explanation: string | null;
  confidence: number | null;
  decorative: boolean;
  needsReview: boolean;
  srBefore: string | null;
  srAfter: string | null;
}

export interface WsStageMessage {
  stage: ScanStatus | "failed";
  issueCount?: number;
  done?: number;
  total?: number;
  scoreBefore?: number;
  code?: string;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}
