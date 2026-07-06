import { useState } from "react";
import { diffWordsWithSpace } from "diff";

/** Before/after code diff (Docs/06 §3.4): word-level highlight, copy button. */

function Pane({
  title,
  code,
  other,
  mode,
}: {
  title: string;
  code: string;
  other: string;
  mode: "removed" | "added";
}) {
  const parts = diffWordsWithSpace(mode === "removed" ? code : other, mode === "removed" ? other : code);
  return (
    <div className="min-w-0 rounded-lg border border-border bg-bg">
      <div className="border-b border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted">
        {title}
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
        {parts.map((part, i) => {
          if (mode === "removed" && part.added) return null;
          if (mode === "added" && part.removed) return null;
          const changed = mode === "removed" ? part.removed : part.added;
          return (
            <span
              key={i}
              className={
                changed
                  ? mode === "removed"
                    ? "rounded-sm bg-danger/15 text-danger"
                    : "rounded-sm bg-success/15 text-success"
                  : "text-text"
              }
            >
              {part.value}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

export function DiffView({ original, fixed }: { original: string; fixed: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fixed);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — leave button state unchanged
    }
  };

  return (
    <section aria-label="Before and after code">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted">
          Before / After
        </h3>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted transition-colors hover:border-primary hover:text-text"
        >
          {copied ? "Copied ✓" : "Copy fixed code"}
        </button>
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <Pane title="Original" code={original} other={fixed} mode="removed" />
        <Pane title="Fixed" code={fixed} other={original} mode="added" />
      </div>
    </section>
  );
}
