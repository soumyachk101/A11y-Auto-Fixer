import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Issue } from "../lib/types";
import { SeverityPill } from "./SeverityPill";

/** Prioritized issue list — keyboard arrow navigation (Docs/06 §4). */

const CATEGORY_LABEL: Record<string, string> = {
  "alt-text": "Alt text",
  "aria-label": "Label",
  contrast: "Contrast",
  structure: "Structure",
  lang: "Language",
  other: "Other",
};

function Row({
  issue,
  selected,
  onSelect,
}: {
  issue: Issue;
  selected: boolean;
  onSelect: () => void;
}) {
  const resolved = issue.status !== "detected";
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      data-issue-row
      onClick={onSelect}
      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
        selected
          ? "border-primary bg-surface-2"
          : "border-transparent hover:border-border hover:bg-surface-2"
      } ${resolved ? "opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <SeverityPill severity={issue.severity} />
        <span className="font-mono text-[11px] text-muted">
          {/^\d/.test(issue.wcagCriterion) ? issue.wcagCriterion.split(" ")[0] : "BP"}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        {issue.status === "fixed" && (
          <span aria-hidden="true" className="text-success">✓</span>
        )}
        <span className="truncate text-sm">{issue.description}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <code className="truncate font-mono text-[11px] text-muted">{issue.element.selector}</code>
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
          {issue.status === "detected" ? CATEGORY_LABEL[issue.category] : issue.status}
        </span>
      </div>
    </button>
  );
}

export function IssueList({
  issues,
  selectedId,
  onSelect,
}: {
  issues: Issue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const index = issues.findIndex((i) => i.id === selectedId);
    const next =
      event.key === "ArrowDown"
        ? Math.min(issues.length - 1, index + 1)
        : Math.max(0, index === -1 ? 0 : index - 1);
    const target = issues[next];
    if (target) {
      onSelect(target.id);
      const rows = listRef.current?.querySelectorAll<HTMLButtonElement>("[data-issue-row]");
      rows?.[next]?.focus();
    }
  };

  if (issues.length === 0) {
    return (
      <p className="px-3 py-8 text-center text-sm text-muted">
        No issues match these filters.
      </p>
    );
  }

  return (
    <motion.div
      ref={listRef}
      role="listbox"
      aria-label="Accessibility issues, worst first"
      onKeyDown={onKeyDown}
      className="flex flex-col gap-1"
      initial={reduced ? false : "hidden"}
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.04 } } }}
    >
      {issues.map((issue) => (
        <motion.div
          key={issue.id}
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
          }}
        >
          <Row
            issue={issue}
            selected={issue.id === selectedId}
            onSelect={() => onSelect(issue.id)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
