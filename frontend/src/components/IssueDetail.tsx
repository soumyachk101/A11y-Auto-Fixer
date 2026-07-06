import { useState } from "react";
import type { Issue } from "../lib/types";
import { useAppStore } from "../store/useAppStore";
import { DiffView } from "./DiffView";
import { SeverityPill } from "./SeverityPill";
import { SrSimulator } from "./SrSimulator";

/** Issue detail panel — sections per Docs/06 §3.4. */

const SOURCE_LABEL: Record<string, string> = {
  "ai-vision": "AI vision",
  "ai-llm": "AI",
  deterministic: "Computed",
};

function ConfidenceBadge({ issue }: { issue: Issue }) {
  const fix = issue.fix;
  if (!fix) return null;
  const isAi = fix.source !== "deterministic";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-muted">
        {SOURCE_LABEL[fix.source]}
        {isAi && fix.confidence !== null && ` · ${Math.round(fix.confidence * 100)}%`}
      </span>
      {fix.needsReview && (
        <span className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 font-mono text-[11px] text-warning">
          needs review
        </span>
      )}
      {isAi && !fix.needsReview && (
        <span className="text-[11px] text-muted">Review before shipping.</span>
      )}
    </div>
  );
}

export function IssueDetail({ issue }: { issue: Issue | null }) {
  const applyFix = useAppStore((s) => s.applyFix);
  const dismissIssue = useAppStore((s) => s.dismissIssue);
  const reopenIssue = useAppStore((s) => s.reopenIssue);
  const regenerateFix = useAppStore((s) => s.regenerateFix);
  const busy = useAppStore((s) => s.busyIssueIds);
  const [imageFailed, setImageFailed] = useState(false);

  if (!issue) {
    return (
      <div className="grid h-full min-h-64 place-items-center rounded-xl border border-border bg-surface p-8">
        <p className="text-sm text-muted">Select an issue to see the fix.</p>
      </div>
    );
  }

  const isBusy = busy.has(issue.id);
  const resolved = issue.status !== "detected";

  return (
    <article
      key={issue.id}
      aria-label={`Issue detail: ${issue.description}`}
      className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5"
    >
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SeverityPill severity={issue.severity} />
          {issue.helpUrl && (
            <a
              href={issue.helpUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Learn more ↗
            </a>
          )}
        </div>
        <h2 className="text-lg font-semibold leading-snug">{issue.description}</h2>
        <p className="font-mono text-xs text-muted">
          {issue.ruleId} ·{" "}
          {issue.wcagCriterion.startsWith("WCAG") ? issue.wcagCriterion : `WCAG ${issue.wcagCriterion}`}
        </p>
      </header>

      <section aria-label="Affected element">
        <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">Element</h3>
        {issue.element.imageUrl && !imageFailed && (
          <img
            src={issue.element.imageUrl}
            alt="The image this issue refers to"
            onError={() => setImageFailed(true)}
            className="mb-2 max-h-36 rounded-lg border border-border object-contain"
          />
        )}
        <pre className="overflow-x-auto rounded-lg border border-border bg-bg p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
          <code>{issue.element.html}</code>
        </pre>
        <p className="mt-1.5 truncate font-mono text-[11px] text-muted">{issue.element.selector}</p>
      </section>

      {issue.fix ? (
        <>
          <DiffView original={issue.fix.originalCode} fixed={issue.fix.fixedCode} />
          {issue.fix.explanation && (
            <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-muted">
              {issue.fix.explanation}
            </p>
          )}
          {issue.screenReader && (
            <SrSimulator before={issue.screenReader.before} after={issue.screenReader.after} />
          )}
          <ConfidenceBadge issue={issue} />
        </>
      ) : (
        <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-muted">
          No automatic fix for this issue type — it needs a manual pass. The element and WCAG
          reference above show what to change.
        </p>
      )}

      <footer className="flex flex-wrap gap-2 border-t border-border pt-4">
        {resolved ? (
          <button
            type="button"
            onClick={() => void reopenIssue(issue.id)}
            className="rounded-md border border-border bg-surface-2 px-4 py-2 text-sm font-medium transition-colors hover:border-primary"
          >
            Reopen
          </button>
        ) : (
          <>
            {issue.fix && (
              <button
                type="button"
                onClick={() => void applyFix(issue.id)}
                disabled={isBusy}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-ink transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isBusy ? "Applying…" : "Apply fix"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void regenerateFix(issue.id)}
              disabled={isBusy}
              className="rounded-md border border-border bg-surface-2 px-4 py-2 text-sm font-medium transition-colors hover:border-primary disabled:opacity-50"
            >
              {isBusy ? "Working…" : "Regenerate"}
            </button>
            <button
              type="button"
              onClick={() => void dismissIssue(issue.id)}
              disabled={isBusy}
              className="rounded-md border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
            >
              Dismiss
            </button>
          </>
        )}
      </footer>
    </article>
  );
}
