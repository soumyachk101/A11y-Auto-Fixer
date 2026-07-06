import { motion } from "motion/react";
import { useAppStore } from "../store/useAppStore";
import type { ScanStage } from "../lib/types";

/** Scanning view (Docs/06 §3.2): stage stepper + live progress, aria-live. */

const STAGES: Array<{ key: ScanStage; label: string }> = [
  { key: "rendering", label: "Rendering" },
  { key: "scanning", label: "Scanning" },
  { key: "analyzing", label: "Analyzing" },
  { key: "fixing", label: "Fixing" },
  { key: "complete", label: "Done" },
];

export function Scanning() {
  const stage = useAppStore((s) => s.stage);
  const progress = useAppStore((s) => s.progress);
  const reset = useAppStore((s) => s.reset);

  const activeIndex = Math.max(
    0,
    STAGES.findIndex((s) => s.key === stage),
  );

  const statusText =
    stage === "fixing" && progress.total > 0
      ? `Generating fixes — ${progress.done} of ${progress.total}`
      : stage === "analyzing" && progress.issueCount > 0
        ? `${progress.issueCount} issues found — prioritizing`
        : `${STAGES[activeIndex]?.label ?? "Starting"}…`;

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-lg">
        <ol className="mb-8 flex items-center justify-between gap-1" aria-hidden="true">
          {STAGES.map((s, i) => {
            const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "todo";
            return (
              <li key={s.key} className="flex flex-1 flex-col items-center gap-2">
                <span
                  className={`grid size-7 place-items-center rounded-full border font-mono text-[11px] transition-colors ${
                    state === "done"
                      ? "border-success bg-success/15 text-success"
                      : state === "active"
                        ? "border-primary bg-primary/15 text-primary motion-safe:animate-[al-pulse_1.4s_ease-out_infinite]"
                        : "border-border text-muted"
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span
                  className={`text-[11px] ${state === "active" ? "text-text" : "text-muted"}`}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>

        <div
          className="h-1.5 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={
            stage === "fixing" && progress.total > 0
              ? Math.round((progress.done / progress.total) * 100)
              : undefined
          }
          aria-label="Scan progress"
        >
          <motion.div
            className="relative h-full overflow-hidden rounded-full bg-primary"
            animate={{
              width:
                stage === "fixing" && progress.total > 0
                  ? `${Math.round(20 + (progress.done / progress.total) * 75)}%`
                  : `${Math.min(95, 12 + activeIndex * 20)}%`,
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent motion-safe:animate-[al-sweep_1.6s_ease-in-out_infinite]"
            />
          </motion.div>
        </div>

        <p aria-live="polite" className="mt-4 text-center text-sm text-muted">
          {statusText}
        </p>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-border bg-surface-2 px-4 py-2 text-sm text-muted transition-colors hover:border-danger hover:text-danger"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
