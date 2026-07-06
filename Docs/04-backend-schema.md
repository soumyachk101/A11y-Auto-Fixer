# 04 — Backend API Schema

**Product:** AccessLens
**Base URL:** `/api`
**Format:** JSON. All timestamps ISO 8601 UTC. IDs are `cuid`/`uuid` strings.
**Realtime:** WebSocket at `/ws/scans/:id` for scan progress.

---

## Conventions

- **Auth:** none in MVP (add bearer token later). All endpoints public for the demo.
- **Errors:** consistent envelope:
```json
{ "error": { "code": "SCAN_UNREACHABLE", "message": "The page could not be reached." } }
```
- **Error codes:** `INVALID_URL`, `BLOCKED_URL`, `SCAN_UNREACHABLE`, `SCAN_TIMEOUT`, `NOT_FOUND`, `FIX_FAILED`, `RATE_LIMITED`, `INTERNAL`.
- **Status codes:** `200` ok · `201` created · `202` accepted (async) · `400` bad input · `404` not found · `422` unfixable · `429` rate limited · `500` server.

---

## Enums

```
ScanStatus   = pending | rendering | scanning | analyzing | fixing | complete | failed
Severity     = critical | serious | moderate | minor
FixType      = alt-text | aria-label | contrast | structure | lang | other
IssueStatus  = detected | fixed | dismissed
FixSource    = ai-vision | ai-llm | deterministic
```

---

## 1. Health

### `GET /api/health`
**200**
```json
{ "status": "ok", "version": "1.0.0", "uptimeSec": 1234 }
```

---

## 2. Scans

### `POST /api/scans` — start a scan
**Request**
```json
{ "url": "https://example.com" }
```
**Validation:** must be http/https, public host (SSRF guard rejects localhost/private IPs → `400 BLOCKED_URL`), well-formed (`400 INVALID_URL`).

**202 Accepted**
```json
{
  "scanId": "scn_abc123",
  "status": "pending",
  "url": "https://example.com",
  "wsUrl": "/ws/scans/scn_abc123"
}
```

---

### `GET /api/scans/:id` — scan status + summary
**200**
```json
{
  "id": "scn_abc123",
  "url": "https://example.com",
  "pageTitle": "Example Domain",
  "status": "complete",
  "scoreBefore": 61,
  "scoreAfter": 89,
  "counts": {
    "total": 23,
    "byStatus": { "detected": 5, "fixed": 18, "dismissed": 0 },
    "bySeverity": { "critical": 3, "serious": 8, "moderate": 9, "minor": 3 },
    "autoFixable": 18
  },
  "startedAt": "2026-07-05T17:40:00Z",
  "completedAt": "2026-07-05T17:40:24Z"
}
```
**404** if unknown id.

---

### `GET /api/scans/:id/issues` — list issues (with fixes)
**Query params:** `severity`, `category` (=FixType), `status`, `sort` (default `priority`), `limit`, `offset`.

**200**
```json
{
  "scanId": "scn_abc123",
  "total": 23,
  "issues": [
    {
      "id": "iss_001",
      "ruleId": "image-alt",
      "wcagCriterion": "1.1.1 Non-text Content",
      "severity": "critical",
      "category": "alt-text",
      "impactScore": 48,
      "status": "detected",
      "description": "Image has no alternative text.",
      "helpUrl": "https://dequeuniversity.com/rules/axe/4.9/image-alt",
      "element": {
        "selector": "main > img:nth-child(2)",
        "html": "<img src=\"/dog.jpg\">",
        "imageUrl": "https://example.com/dog.jpg"
      },
      "fix": {
        "id": "fix_001",
        "fixType": "alt-text",
        "source": "ai-vision",
        "originalCode": "<img src=\"/dog.jpg\">",
        "fixedCode": "<img src=\"/dog.jpg\" alt=\"Golden retriever catching a frisbee on a beach\">",
        "explanation": "Generated from the image; concise and descriptive.",
        "confidence": 0.92,
        "decorative": false
      },
      "screenReader": {
        "before": "image",
        "after": "Golden retriever catching a frisbee on a beach, image"
      }
    }
  ]
}
```

---

### `POST /api/scans/:id/rescan`
Re-runs the scan on the same URL. **202** with the same shape as `POST /api/scans`.

### `GET /api/scans/:id/export?format=html|json|report`
- `html` → `200`, `Content-Type: text/html`, body = patched HTML (original with all **applied** fixes merged).
- `json` → `200`, full issues + fixes payload.
- `report` → `200`, `text/html` before/after summary report (P1).

**Example (json)** = the `/issues` payload plus scan summary.

---

## 3. Issues & fixes

### `GET /api/issues/:id` — single issue detail
Returns one issue object (same shape as in the list, including `fix` and `screenReader`). **404** if unknown.

### `POST /api/issues/:id/fix` — (re)generate a fix
Use when a fix wasn't generated during scan, or to regenerate. Optional body to nudge generation:
```json
{ "regenerate": true, "hint": "This is a decorative divider" }
```
**200**
```json
{ "issueId": "iss_001", "fix": { "...": "same Fix shape as above" } }
```
**422 FIX_FAILED** if the issue type isn't auto-fixable, with a human-readable reason.

### `POST /api/issues/:id/apply` — mark fix applied
No body. **200**
```json
{
  "issue": { "id": "iss_001", "status": "fixed" },
  "scoreAfter": 89
}
```

### `POST /api/issues/:id/dismiss` — dismiss an issue
Optional `{ "reason": "false positive" }`. **200**
```json
{ "issue": { "id": "iss_001", "status": "dismissed" }, "scoreAfter": 84 }
```

### `POST /api/issues/:id/reopen` — undo apply/dismiss
**200** returns issue with `status: "detected"` and recomputed `scoreAfter`.

---

## 4. (P1) Scan pasted HTML

### `POST /api/scans/html`
```json
{ "html": "<!doctype html><html>…</html>", "label": "pasted snippet" }
```
Runs axe against the provided HTML (loaded into a headless page) instead of a live URL. Same **202** response shape. Handy demo fallback if live scanning is blocked.

---

## 5. WebSocket — scan progress

**Connect:** `/ws/scans/:id`
**Server → client messages:**
```json
{ "stage": "rendering" }
{ "stage": "scanning" }
{ "stage": "analyzing", "issueCount": 23 }
{ "stage": "fixing", "done": 12, "total": 18 }
{ "stage": "complete", "scoreBefore": 61 }
{ "stage": "failed", "code": "SCAN_UNREACHABLE", "message": "…" }
```
Client shows a stage indicator + a progress bar during `fixing`. On `complete`, client calls `GET /api/scans/:id/issues`.

---

## 6. Rate limiting & abuse (recommended)

- Per-IP limit on `POST /api/scans` (e.g. 10/min) → `429 RATE_LIMITED`.
- Enforce SSRF guard **before** creating the scan record.
- Cap max issues fix-generated per scan (config `MAX_AI_FIXES`, default e.g. 25) to bound AI cost; remaining issues still listed as `detected`.

---

## 7. Minimal endpoint checklist (MVP)

- [x] `POST /api/scans`
- [x] `GET /api/scans/:id`
- [x] `GET /api/scans/:id/issues`
- [x] `POST /api/issues/:id/apply`
- [x] `POST /api/issues/:id/dismiss`
- [x] `GET /api/scans/:id/export?format=html`
- [x] `WS /ws/scans/:id`
- [x] `GET /api/health`
- [ ] `POST /api/issues/:id/fix` (regen) — nice to have
- [ ] `POST /api/scans/html` (P1 fallback)
