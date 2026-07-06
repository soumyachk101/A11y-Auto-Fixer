import type { Severity } from "../lib/types";

/** Severity encoded as dot + word — never color alone (Docs/06 §2). */

const STYLES: Record<Severity, { dot: string; text: string }> = {
  critical: { dot: "bg-danger", text: "text-danger" },
  serious: { dot: "bg-serious", text: "text-serious" },
  moderate: { dot: "bg-warning", text: "text-warning" },
  minor: { dot: "bg-muted", text: "text-muted" },
};

export function SeverityPill({ severity }: { severity: Severity }) {
  const s = STYLES[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wider ${s.text}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${s.dot}`} />
      {severity}
    </span>
  );
}
