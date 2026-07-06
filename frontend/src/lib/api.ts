import type { Issue, ScanSummary } from "./types";

/** Thin typed client for the AccessLens API (proxied to :4000 by Vite). */

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(err?.code ?? "INTERNAL", err?.message ?? "Something went wrong.");
  }
  return body as T;
}

export const api = {
  startScan: (url: string) =>
    request<{ scanId: string; wsUrl: string }>("/scans", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  startHtmlScan: (html: string, label: string) =>
    request<{ scanId: string; wsUrl: string }>("/scans/html", {
      method: "POST",
      body: JSON.stringify({ html, label }),
    }),

  getScan: (id: string) => request<ScanSummary>(`/scans/${id}`),

  listIssues: (id: string) =>
    request<{ scanId: string; total: number; issues: Issue[] }>(`/scans/${id}/issues`),

  applyFix: (issueId: string) =>
    request<{ issue: { id: string; status: string }; scoreAfter: number }>(
      `/issues/${issueId}/apply`,
      { method: "POST" },
    ),

  dismissIssue: (issueId: string) =>
    request<{ issue: { id: string; status: string }; scoreAfter: number }>(
      `/issues/${issueId}/dismiss`,
      { method: "POST" },
    ),

  reopenIssue: (issueId: string) =>
    request<{ issue: { id: string; status: string }; scoreAfter: number }>(
      `/issues/${issueId}/reopen`,
      { method: "POST" },
    ),

  regenerateFix: (issueId: string, hint?: string) =>
    request<{ issueId: string; fix: Issue["fix"] }>(`/issues/${issueId}/fix`, {
      method: "POST",
      body: JSON.stringify({ regenerate: true, hint }),
    }),

  exportUrl: (scanId: string, format: "html" | "json") =>
    `/api/scans/${scanId}/export?format=${format}`,
};

export { ApiError };
