import { useEffect, useRef } from "react";
import { api } from "../lib/api";
import { useAppStore } from "../store/useAppStore";

/** Export modal — focus trap, Esc to close, focus return (Docs/06 §5). */

export function ExportPanel() {
  const open = useAppStore((s) => s.exportOpen);
  const setOpen = useAppStore((s) => s.setExportOpen);
  const scan = useAppStore((s) => s.scan);
  const issues = useAppStore((s) => s.issues);
  const showToast = useAppStore((s) => s.showToast);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const appliedCount = issues.filter((i) => i.status === "fixed").length;

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button, a")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusables = dialog.querySelectorAll<HTMLElement>("button, a[href]");
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previousFocus.current?.focus();
    };
  }, [open, setOpen]);

  if (!open || !scan) return null;

  const copyAllFixes = async () => {
    const applied = issues.filter((i) => i.status === "fixed" && i.fix);
    const text = applied
      .map((i) => `/* ${i.description} (${i.element.selector}) */\n${i.fix!.fixedCode}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text || "No applied fixes yet.");
      showToast(`Copied ${applied.length} fix${applied.length === 1 ? "" : "es"}`);
    } catch {
      showToast("Clipboard unavailable in this browser.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 id="export-title" className="text-base font-semibold">
            Export
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close export dialog"
            className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-muted">
          {appliedCount} applied fix{appliedCount === 1 ? "" : "es"} included.
        </p>
        <div className="flex flex-col gap-2">
          <a
            href={api.exportUrl(scan.id, "html")}
            download
            className="rounded-md bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-ink transition-opacity hover:opacity-90"
          >
            Download patched HTML
          </a>
          <button
            type="button"
            onClick={() => void copyAllFixes()}
            className="rounded-md border border-border bg-surface-2 px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary"
          >
            Copy applied fixes
          </button>
          <a
            href={api.exportUrl(scan.id, "json")}
            download
            className="rounded-md border border-border bg-surface-2 px-4 py-2.5 text-center text-sm font-medium transition-colors hover:border-primary"
          >
            Download JSON report
          </a>
        </div>
      </div>
    </div>
  );
}
