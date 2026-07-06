import { SEVERITY_WEIGHT, USER_IMPACT_WEIGHT } from "../config.js";

/**
 * Priority score = severityWeight x userImpactWeight x occurrenceCount
 * (Docs/02 §3.3). Higher = fix first. The dashboard sorts descending,
 * so judges see "worst first".
 */
export function prioritize(severity: string, category: string, occurrenceCount: number): number {
  const sev = SEVERITY_WEIGHT[severity] ?? 1;
  const impact = USER_IMPACT_WEIGHT[category] ?? 1;
  // Cap the occurrence multiplier so a flood of moderate issues (e.g. 8x
  // "region") never outranks a single critical barrier.
  return sev * impact * Math.min(3, Math.max(1, occurrenceCount));
}
