import { create } from "zustand";
import { api } from "../lib/api";
import type { Issue, ScanStage, ScanSummary, WsStageMessage } from "../lib/types";

/** Single store (Docs/03 §8) so score badge, list and detail stay in sync. */

export type View = "landing" | "scanning" | "error" | "results";

interface Filters {
  severity: string;
  category: string;
  status: string;
}

interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

interface AppState {
  view: View;
  scan: ScanSummary | null;
  stage: ScanStage;
  progress: { done: number; total: number; issueCount: number };
  errorMessage: string | null;
  issues: Issue[];
  filters: Filters;
  selectedIssueId: string | null;
  exportOpen: boolean;
  toast: Toast | null;
  busyIssueIds: Set<string>;

  startScan: (url: string) => Promise<void>;
  startSampleScan: (html: string) => Promise<void>;
  reset: () => void;
  selectIssue: (id: string | null) => void;
  setFilter: (key: keyof Filters, value: string) => void;
  applyFix: (issueId: string) => Promise<void>;
  dismissIssue: (issueId: string) => Promise<void>;
  reopenIssue: (issueId: string) => Promise<void>;
  regenerateFix: (issueId: string, hint?: string) => Promise<void>;
  setExportOpen: (open: boolean) => void;
  showToast: (message: string, undo?: () => void) => void;
  clearToast: () => void;
}

let ws: WebSocket | null = null;
let toastCounter = 0;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function connectWs(scanId: string, onMessage: (msg: WsStageMessage) => void): void {
  ws?.close();
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${protocol}://${location.host}/ws/scans/${scanId}`);
  ws.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data as string) as WsStageMessage);
    } catch {
      // malformed frame — ignore
    }
  };
}

type Setter = (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;
type Getter = () => AppState;

function followScan(scanId: string, set: Setter, get: Getter): void {
  connectWs(scanId, async (msg) => {
    if (msg.stage === "failed") {
      set({ view: "error", errorMessage: msg.message ?? "The page could not be scanned." });
      return;
    }
    set({
      stage: msg.stage,
      progress: {
        done: msg.done ?? get().progress.done,
        total: msg.total ?? get().progress.total,
        issueCount: msg.issueCount ?? get().progress.issueCount,
      },
    });
    if (msg.stage === "complete") {
      const [scan, issueList] = await Promise.all([api.getScan(scanId), api.listIssues(scanId)]);
      set({ scan, issues: issueList.issues, view: "results", selectedIssueId: null });
    }
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  view: "landing",
  scan: null,
  stage: "pending",
  progress: { done: 0, total: 0, issueCount: 0 },
  errorMessage: null,
  issues: [],
  filters: { severity: "", category: "", status: "" },
  selectedIssueId: null,
  exportOpen: false,
  toast: null,
  busyIssueIds: new Set(),

  async startScan(url) {
    set({ view: "scanning", stage: "pending", errorMessage: null, progress: { done: 0, total: 0, issueCount: 0 } });
    try {
      const { scanId } = await api.startScan(url);
      followScan(scanId, set, get);
    } catch (err) {
      set({ view: "error", errorMessage: err instanceof Error ? err.message : "Scan failed." });
    }
  },

  async startSampleScan(html) {
    set({ view: "scanning", stage: "pending", errorMessage: null, progress: { done: 0, total: 0, issueCount: 0 } });
    try {
      const { scanId } = await api.startHtmlScan(html, "sample-site");
      followScan(scanId, set, get);
    } catch (err) {
      set({ view: "error", errorMessage: err instanceof Error ? err.message : "Scan failed." });
    }
  },

  reset() {
    ws?.close();
    set({
      view: "landing",
      scan: null,
      stage: "pending",
      issues: [],
      selectedIssueId: null,
      errorMessage: null,
      exportOpen: false,
    });
  },

  selectIssue(id) {
    set({ selectedIssueId: id });
  },

  setFilter(key, value) {
    set({ filters: { ...get().filters, [key]: value } });
  },

  async applyFix(issueId) {
    const { busyIssueIds, showToast } = get();
    if (busyIssueIds.has(issueId)) return;
    set({ busyIssueIds: new Set(busyIssueIds).add(issueId) });
    try {
      const { scoreAfter } = await api.applyFix(issueId);
      set((s) => ({
        issues: s.issues.map((i) => (i.id === issueId ? { ...i, status: "fixed" } : i)),
        scan: s.scan ? { ...s.scan, scoreAfter } : s.scan,
      }));
      showToast("Fix applied", () => void get().reopenIssue(issueId));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not apply the fix.");
    } finally {
      set((s) => {
        const next = new Set(s.busyIssueIds);
        next.delete(issueId);
        return { busyIssueIds: next };
      });
    }
  },

  async dismissIssue(issueId) {
    try {
      const { scoreAfter } = await api.dismissIssue(issueId);
      set((s) => ({
        issues: s.issues.map((i) => (i.id === issueId ? { ...i, status: "dismissed" } : i)),
        scan: s.scan ? { ...s.scan, scoreAfter } : s.scan,
      }));
      get().showToast("Issue dismissed", () => void get().reopenIssue(issueId));
    } catch (err) {
      get().showToast(err instanceof Error ? err.message : "Could not dismiss the issue.");
    }
  },

  async reopenIssue(issueId) {
    try {
      const { scoreAfter } = await api.reopenIssue(issueId);
      set((s) => ({
        issues: s.issues.map((i) => (i.id === issueId ? { ...i, status: "detected" } : i)),
        scan: s.scan ? { ...s.scan, scoreAfter } : s.scan,
      }));
    } catch {
      get().showToast("Could not reopen the issue.");
    }
  },

  async regenerateFix(issueId, hint) {
    const { busyIssueIds, showToast } = get();
    if (busyIssueIds.has(issueId)) return;
    set({ busyIssueIds: new Set(busyIssueIds).add(issueId) });
    try {
      const { fix } = await api.regenerateFix(issueId, hint);
      const fresh = await api.listIssues(get().scan!.id);
      set({ issues: fresh.issues });
      showToast(fix ? "Fix regenerated" : "No fix available for this issue.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not regenerate the fix.");
    } finally {
      set((s) => {
        const next = new Set(s.busyIssueIds);
        next.delete(issueId);
        return { busyIssueIds: next };
      });
    }
  },

  setExportOpen(open) {
    set({ exportOpen: open });
  },

  showToast(message, undo) {
    if (toastTimer) clearTimeout(toastTimer);
    const id = ++toastCounter;
    set({ toast: { id, message, undo } });
    toastTimer = setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, 5000);
  },

  clearToast() {
    set({ toast: null });
  },
}));

/** Derived: issues after filters, sorted worst-first (backend pre-sorts, keep stable). */
export function filteredIssues(issues: Issue[], filters: Filters): Issue[] {
  return issues.filter(
    (i) =>
      (!filters.severity || i.severity === filters.severity) &&
      (!filters.category || i.category === filters.category) &&
      (!filters.status || i.status === filters.status),
  );
}
