import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { filteredIssues, useAppStore } from "../store/useAppStore";
import { FilterBar } from "../components/FilterBar";
import { IssueDetail } from "../components/IssueDetail";
import { IssueList } from "../components/IssueList";
import { ScoreRing } from "../components/ScoreRing";
import { ExportPanel } from "../components/ExportPanel";

/** Results dashboard (Docs/06 §3.3): two-pane desktop, stacked mobile. */

export function Results() {
  const scan = useAppStore((s) => s.scan);
  const issues = useAppStore((s) => s.issues);
  const filters = useAppStore((s) => s.filters);
  const selectedIssueId = useAppStore((s) => s.selectedIssueId);
  const selectIssue = useAppStore((s) => s.selectIssue);
  const setExportOpen = useAppStore((s) => s.setExportOpen);
  const applyFix = useAppStore((s) => s.applyFix);
  const reset = useAppStore((s) => s.reset);

  const reduced = useReducedMotion();
  const visible = useMemo(() => filteredIssues(issues, filters), [issues, filters]);
  const selected = issues.find((i) => i.id === selectedIssueId) ?? null;

  if (!scan) return null;

  const openCount = issues.filter((i) => i.status === "detected").length;
  const safeFixes = issues.filter(
    (i) => i.status === "detected" && i.fix && !i.fix.needsReview,
  );
  const isDemo = scan.url.startsWith("demo://") || scan.url.startsWith("html://");

  const applyAllSafe = async () => {
    for (const issue of safeFixes) {
      // Sequential keeps the score badge narrating each step.
      // eslint-disable-next-line no-await-in-loop
      await applyFix(issue.id);
    }
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1200px] px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 mb-5 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-xs text-muted transition-colors hover:border-primary hover:text-text"
              aria-label="Start a new scan"
            >
              ← New scan
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{scan.pageTitle ?? scan.url}</p>
              <p className="flex items-center gap-2 truncate font-mono text-[11px] text-muted">
                {isDemo && (
                  <span className="rounded-full border border-warning/40 bg-warning/10 px-1.5 text-warning">
                    sample
                  </span>
                )}
                {scan.url}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ScoreRing before={scan.scoreBefore ?? 0} after={scan.scoreAfter ?? scan.scoreBefore ?? 0} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void applyAllSafe()}
                disabled={safeFixes.length === 0}
                className="rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-ink transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Apply all safe ({safeFixes.length})
              </button>
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="rounded-md border border-border bg-surface-2 px-3.5 py-2 text-sm font-medium transition-colors hover:border-primary"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      {issues.length === 0 ? (
        <div className="mx-auto max-w-md rounded-xl border border-border bg-surface p-8 text-center">
          <p className="mb-2 text-2xl">🎉</p>
          <h2 className="mb-2 text-lg font-semibold">No detectable issues</h2>
          <p className="text-sm leading-relaxed text-muted">
            Automated tools catch roughly 30–50% of WCAG criteria. Pair this with manual testing —
            keyboard navigation and a real screen reader — before calling it accessible.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(300px,2fr)_3fr]">
          <section aria-label="Issue list" className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted">
                <span className="font-semibold text-text">{openCount}</span> open ·{" "}
                {scan.counts.autoFixable} auto-fixable
              </p>
              <FilterBar />
            </div>
            <IssueList issues={visible} selectedId={selectedIssueId} onSelect={selectIssue} />
          </section>
          <section aria-label="Issue detail" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selected?.id ?? "empty"}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <IssueDetail issue={selected} />
              </motion.div>
            </AnimatePresence>
          </section>
        </div>
      )}

      <ExportPanel />
    </div>
  );
}
