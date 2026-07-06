// Central config + scoring constants. Weights live here so the demo number
// is explainable: "critical issues cost 10 points each" (Docs/05 §4).

export const config = {
  port: Number(process.env.PORT ?? 4001),
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? "http://localhost:5173",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? null,
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
  maxAiFixes: Number(process.env.MAX_AI_FIXES ?? 25),
  aiConcurrency: Number(process.env.AI_CONCURRENCY ?? 5),
  navigationTimeoutMs: 15_000,
  scanRateLimitPerMin: 10,
} as const;

/** Score penalty per open issue, by severity (Docs/05 §4). */
export const SEVERITY_PENALTY: Record<string, number> = {
  critical: 10,
  serious: 6,
  moderate: 3,
  minor: 1,
};

/** Priority weight, by severity (Docs/02 §3.3). */
export const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
};

/**
 * User-impact weight per fix category: issues that fully block screen-reader
 * or keyboard users outrank cosmetic ones (Docs/02 §3.3).
 */
export const USER_IMPACT_WEIGHT: Record<string, number> = {
  "alt-text": 4,
  "aria-label": 4,
  contrast: 3,
  lang: 2,
  structure: 2,
  other: 1,
};
