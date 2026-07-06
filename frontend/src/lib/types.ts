// API types — mirror Docs/04-backend-schema.md exactly.

export type Severity = "critical" | "serious" | "moderate" | "minor";
export type FixCategory = "alt-text" | "aria-label" | "contrast" | "structure" | "lang" | "other";
export type IssueStatus = "detected" | "fixed" | "dismissed";
export type ScanStage =
  | "pending"
  | "rendering"
  | "scanning"
  | "analyzing"
  | "fixing"
  | "complete"
  | "failed";

export interface Fix {
  id: string;
  fixType: FixCategory;
  source: "ai-vision" | "ai-llm" | "deterministic";
  originalCode: string;
  fixedCode: string;
  explanation: string | null;
  confidence: number | null;
  decorative: boolean;
  needsReview: boolean;
}

export interface Issue {
  id: string;
  ruleId: string;
  wcagCriterion: string;
  severity: Severity;
  category: FixCategory;
  impactScore: number;
  status: IssueStatus;
  description: string;
  helpUrl: string | null;
  element: {
    selector: string;
    html: string;
    imageUrl: string | null;
  };
  fix: Fix | null;
  screenReader: { before: string | null; after: string | null } | null;
}

export interface ScanSummary {
  id: string;
  url: string;
  pageTitle: string | null;
  status: ScanStage;
  scoreBefore: number | null;
  scoreAfter: number | null;
  counts: {
    total: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    autoFixable: number;
  };
  error: { code: string; message: string | null } | null;
  startedAt: string;
  completedAt: string | null;
}

export interface WsStageMessage {
  stage: ScanStage;
  issueCount?: number;
  done?: number;
  total?: number;
  scoreBefore?: number;
  code?: string;
  message?: string;
}
