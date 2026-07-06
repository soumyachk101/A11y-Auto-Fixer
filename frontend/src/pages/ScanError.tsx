import { useAppStore } from "../store/useAppStore";

/** Error state (Docs/06 §3.6): clear cause + retry. */

export function ScanError() {
  const message = useAppStore((s) => s.errorMessage);
  const reset = useAppStore((s) => s.reset);

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center">
        <p aria-hidden="true" className="mb-3 font-mono text-2xl text-danger">
          ✕
        </p>
        <h1 className="mb-2 text-lg font-semibold">This page couldn't be scanned</h1>
        <p role="alert" className="mb-6 text-sm leading-relaxed text-muted">
          {message ?? "The page could not be reached."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-ink transition-opacity hover:opacity-90"
        >
          Try another URL
        </button>
      </div>
    </div>
  );
}
