import { useEffect } from "react";
import { useAppStore } from "./store/useAppStore";
import { Landing } from "./pages/Landing";
import { Scanning } from "./pages/Scanning";
import { Results } from "./pages/Results";
import { ScanError } from "./pages/ScanError";
import { Toast } from "./components/Toast";
import type { Issue, ScanSummary } from "./lib/types";

export default function App() {
  const view = useAppStore((s) => s.view);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    // Dev-only hook: lets tooling (screenshot script) load a scan directly.
    (window as unknown as Record<string, unknown>).__accesslens_load = (
      scan: ScanSummary,
      issues: Issue[],
    ) => useAppStore.setState({ scan, issues, view: "results", selectedIssueId: null });
  }, []);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-ink"
      >
        Skip to main content
      </a>
      <main id="main">
        {view === "landing" && <Landing />}
        {view === "scanning" && <Scanning />}
        {view === "error" && <ScanError />}
        {view === "results" && <Results />}
      </main>
      <Toast />
    </>
  );
}
