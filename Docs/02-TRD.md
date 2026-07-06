# 02 — Technical Requirements Document (TRD)

**Product:** AccessLens
**Companion docs:** `01-PRD.md` (what/why), `04-backend-schema.md` (API), `05-database.md` (data), `07-ai-instructions.md` (AI features)

---

## 1. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React + Vite + TS + Tailwind)                      │
│  URL input · scan progress · issue list · fix diff · SR sim  │
└───────────────┬─────────────────────────────────────────────┘
                │  REST (JSON) + WebSocket (scan progress)
┌───────────────▼─────────────────────────────────────────────┐
│  API server (Node + Express + TS)                            │
│  ┌──────────┐ ┌──────────────┐ ┌───────────┐ ┌────────────┐  │
│  │ Scan     │ │ Issue        │ │ Fix       │ │ Export     │  │
│  │ Controller│ │ Controller   │ │ Controller│ │ Controller │  │
│  └────┬─────┘ └──────┬───────┘ └─────┬─────┘ └─────┬──────┘  │
│       │              │               │             │         │
│  ┌────▼──────────────▼───────────────▼─────────────▼──────┐  │
│  │ Services layer                                          │  │
│  │  ScanEngine · IssueParser · Prioritizer · FixGenerator  │  │
│  └────┬───────────────┬──────────────────┬────────────────┘  │
└───────┼───────────────┼──────────────────┼──────────────────┘
        │               │                  │
   ┌────▼─────┐   ┌──────▼──────┐    ┌──────▼───────────┐
   │Playwright│   │ PostgreSQL  │    │ Anthropic Claude │
   │+axe-core │   │  (Prisma)   │    │  API (vision+LLM)│
   └──────────┘   └─────────────┘    └──────────────────┘
```

---

## 2. Tech stack & justification

| Layer | Choice | Why this |
|-------|--------|----------|
| Frontend | React 18 + Vite + TS + Tailwind | Fast dev, type safety, one language (TS) across the stack |
| Backend | Node + Express + TS | `axe-core` and `Playwright` are JS-native → no cross-language glue |
| Scan engine | **axe-core** in **Playwright** (headless Chromium) | axe-core is the industry-standard WCAG rules engine (used by Lighthouse/Deque); Playwright renders JS-heavy pages reliably |
| AI | Anthropic Claude API | Has **vision** (alt text from real images) + strong code generation (ARIA/semantic) |
| Contrast | Pure WCAG math | Deterministic, instant, 100% reliable — no AI needed |
| DB | PostgreSQL + Prisma | Typed queries, easy migrations; SQLite fine for pure-hackathon |
| Jobs | In-process async (MVP) | A scan is one job; no queue infra needed for demo. Optional BullMQ+Redis later |
| Realtime | WebSocket (`ws`) | Stream scan progress (rendering → scanning → generating fixes) |
| Deploy | Vercel (FE) + Render/Railway (BE) | Free tiers, Git-push deploy; BE must allow headless Chromium |

> **Single-language rationale:** keeping everything in TypeScript means shared types between the scan engine, API, and frontend, which is a big velocity win for a small team in one week.

---

## 3. Core components

### 3.1 ScanEngine (`services/scanEngine.ts`)
- Launches Playwright headless Chromium, navigates to the URL (timeout ~15s, block downloads).
- Injects `axe-core`, runs `axe.run()` scoped to WCAG 2.1 A/AA rule tags.
- Also collects, for each violation node: the element's `outerHTML`, a CSS selector, bounding box, and — for image issues — the resolved image URL (for the vision step).
- Returns raw axe results + enriched node data.
- **Failure handling:** if navigation fails or the page is empty, return a typed error `SCAN_UNREACHABLE` (the frontend shows a clear message; never silently fake a result).

### 3.2 IssueParser (`services/issueParser.ts`)
- Maps each axe violation → internal `Issue` (ruleId, wcagCriterion, severity/impact, category, element, description, helpUrl).
- Buckets issues into fix categories: `alt-text` | `aria-label` | `contrast` | `structure` | `lang` | `other`.

### 3.3 Prioritizer (`services/prioritizer.ts`)
- Score = `severityWeight × userImpactWeight × occurrenceCount`.
- severity: critical=4, serious=3, moderate=2, minor=1.
- userImpact: blocking for SR/keyboard users weighted higher.
- Sort descending → the list judges see is "worst first".

### 3.4 FixGenerator (`services/fixGenerator/`)
Strategy pattern — one generator per category:
- `altTextFixer.ts` → Claude **vision** call (image + page context) → alt text. See `07-ai-instructions.md §Alt-text`.
- `ariaFixer.ts` → Claude LLM call (element HTML + surrounding context) → corrected markup. See `07 §ARIA`.
- `contrastFixer.ts` → **deterministic**: parse fg/bg colors, compute WCAG ratio, search nearest color meeting AA (4.5:1 text / 3:1 large). No AI.
- `structureFixer.ts` / `langFixer.ts` → rule-based corrected snippets.
- Each returns `{ originalCode, fixedCode, fixType, aiGenerated, confidence?, explanation }`.

### 3.5 Controllers
Thin HTTP handlers → call services → shape responses per `04-backend-schema.md`.

---

## 4. Data flow (single scan)

1. `POST /api/scans {url}` → create `Scan(status=pending)` → return `scanId`, start async job, client opens WS.
2. Job: **rendering** → ScanEngine renders page (WS: `rendering`).
3. Job: **scanning** → axe runs, violations collected (WS: `scanning`).
4. Job: parse + prioritize → persist `Issue` rows (WS: `analyzing`).
5. Job: **generating fixes** → FixGenerator per issue (contrast first/instant; AI calls batched/concurrent with a cap) (WS: `fixing`, with progress count).
6. Job: persist `Fix` rows, compute `scoreBefore` → `Scan(status=complete)` (WS: `complete`).
7. Client fetches `GET /api/scans/:id/issues` → renders dashboard.
8. User applies/dismisses fixes → `POST /api/issues/:id/apply|dismiss` → recompute `scoreAfter`.

---

## 5. AI usage (see `07-ai-instructions.md` for full prompts)

- **Alt text:** Claude vision. Input: base64/URL image + page title + nearby text. Output: JSON `{alt, decorative, confidence}`. Guardrails: <125 chars, no "image of", decorative → `alt=""`, don't invent text not visible.
- **ARIA/labels:** Claude LLM. Input: element `outerHTML` + surrounding DOM snippet + rule. Output: JSON `{fixedHtml, explanation, confidence}`. Guardrails: minimal change, valid ARIA only, preserve behavior.
- **Determinism where possible:** contrast, lang, attribute-presence are NOT AI.
- **Cost/latency controls:** cap concurrent AI calls (e.g. 5), cache by content hash, set `max_tokens` low, prefer a Sonnet-class model for balance. Fall back to a rule-based placeholder fix if the API errors, and flag it.

---

## 6. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Performance | Single-page scan + fixes < ~30s typical; show progress the whole time |
| Reliability | AI/API failure never crashes a scan; degrade to detection-only for that issue |
| Security | Validate/normalize input URL; block `file://`, localhost, and private IP ranges (SSRF guard); scan only public http(s) |
| Privacy | Don't persist page content longer than needed; no secrets in logs; API key server-side only |
| Accessibility (self) | **The tool itself must meet WCAG 2.1 AA** — we dogfood. Keyboard nav, focus management, ARIA, contrast (see `06-ui-ux.md`) |
| Observability | Structured logs per scan stage; timing per stage; error codes |

> **Dogfooding is a pitch weapon:** run AccessLens on AccessLens and show it passes.

---

## 7. Security notes (SSRF is the real one)

Because the backend fetches arbitrary user-supplied URLs with a headless browser, it's an SSRF risk. Required guards:
- Allow only `http`/`https` schemes.
- Resolve the hostname and **reject private/reserved IP ranges** (127.0.0.0/8, 10/8, 172.16/12, 192.168/16, 169.254/16, ::1, etc.).
- Reject `localhost` and metadata endpoints (169.254.169.254).
- Enforce navigation timeout and block file downloads.
- Never reflect raw fetched content into logs or error messages verbatim.

---

## 8. Deployment

- **Frontend:** Vercel. Env: `VITE_API_URL`.
- **Backend:** Render or Railway (must support the Playwright Chromium binary — use the Playwright base image or install browsers in the build step). Env: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `PORT`, `ALLOWED_ORIGIN`.
- **DB:** Render/Railway managed PostgreSQL (or Supabase). SQLite acceptable if deploying backend as a single container.
- **CORS:** restrict to the frontend origin.

---

## 9. Repo structure (suggested)

```
accesslens/
├── docs/                      # these .md files
├── backend/
│   ├── src/
│   │   ├── index.ts           # express app + ws
│   │   ├── routes/            # scans, issues, export, health
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── scanEngine.ts
│   │   │   ├── issueParser.ts
│   │   │   ├── prioritizer.ts
│   │   │   └── fixGenerator/
│   │   │       ├── altTextFixer.ts
│   │   │       ├── ariaFixer.ts
│   │   │       ├── contrastFixer.ts
│   │   │       └── index.ts
│   │   ├── lib/               # anthropic client, contrast math, ssrf guard
│   │   ├── prisma/            # schema.prisma, migrations
│   │   └── types/
│   └── package.json
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── pages/             # Landing, Results
    │   ├── components/        # ScanInput, IssueList, IssueDetail, DiffView, SrSimulator, ScoreBadge
    │   ├── lib/api.ts
    │   └── store/             # zustand
    └── package.json
```

---

## 10. Build phases (maps to the 7-day plan)

- **Phase 1 (D1):** Scan engine returns raw violations for a URL (CLI/console first).
- **Phase 2 (D2):** Parse + prioritize + persist; `GET issues` API.
- **Phase 3 (D3):** Alt-text (vision) + contrast (deterministic) fixers.
- **Phase 4 (D4):** ARIA fixer + before/after diff endpoint.
- **Phase 5 (D5):** Frontend end-to-end (input → progress → dashboard → detail).
- **Phase 6 (D6):** Screen-reader simulation + export + deploy + SSRF guard.
- **Phase 7 (D7):** Demo rehearsal, bug-fix, README, backup video.

## 11. Key technical risks

| Risk | Mitigation |
|------|------------|
| Headless Chromium won't run on host | Use Playwright Docker base image; test deploy early (D5, not D7) |
| AI latency stacks up on many issues | Concurrency cap + contrast-first + cache + only fix top N in demo |
| axe selector → element re-mapping for "apply" | Store selector + outerHTML at scan time; apply against saved snapshot |
| SSRF / abuse | IP-range guard (see §7) |
| Model output not valid JSON | Enforce JSON, parse defensively, retry once, fallback to rule-based |
