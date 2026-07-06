# AccessLens

> **Find it. Fix it. Ship accessible.**

Tools like axe, Lighthouse and WAVE **tell you** what's broken. AccessLens **fixes it**: it scans any page for WCAG 2.1 AA violations and generates the actual code corrections — AI-written alt text from the real image, correct labels and ARIA, mathematically nearest compliant colors — each with a before/after diff and a **screen-reader simulation** so you hear the difference a fix makes.

Full product/engineering spec lives in [`Docs/`](Docs/00-README.md).

## Stack

- **Frontend** — React 18 + Vite + TypeScript + Tailwind CSS v4 + Motion + Zustand
- **Backend** — Node + Express + TypeScript, Prisma (SQLite), WebSocket progress
- **Scan engine** — axe-core running inside Playwright (headless Chromium)
- **AI fixes** — Anthropic Claude (vision for alt text, LLM for ARIA); contrast/lang/structure fixes are deterministic code, no AI

## Quick start

```bash
npm install                       # installs both workspaces
npx playwright install chromium   # if not already cached

cd backend
npx prisma db push                # create SQLite schema
cd ..

npm run dev                       # backend :4000 + frontend :5173
```

Open http://localhost:5173 → paste a URL or click **try a sample site**.

### AI fixes (optional but the whole point)

```bash
# backend/.env
ANTHROPIC_API_KEY=sk-ant-...
```

Without a key the scan still works — contrast, lang and structure fixes are generated normally; alt-text and label fixes degrade to clearly-flagged placeholders.

### Seed the offline demo

```bash
npm run seed        # runs the real pipeline against the bundled fixture
```

Creates a pre-scanned `demo://sample-site` scan in the DB — a safety net for demoing with no network.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Both servers, hot reload |
| `npm run seed` | Seed the offline demo scan |
| `npm test -w backend` | Unit tests (WCAG contrast math, scoring, prioritizer) |
| `npm run scan:cli -w backend -- <url\|file>` | Scan from the terminal, print violations |
| `npm run build` | Production builds |

## How a scan works

1. `POST /api/scans` — URL validated + SSRF-guarded (no localhost/private IPs), scan row created, async job starts
2. Playwright renders the page, axe-core runs WCAG 2.1 A/AA + best-practice rules
3. Violations parsed → prioritized (severity × user-impact × occurrences) → persisted
4. Fix generation: deterministic first (contrast math, lang, structure), then AI (alt text via vision on the actual image, labels via LLM) — capped by `MAX_AI_FIXES`, cached, concurrency-limited
5. WebSocket streams stage progress; UI renders the dashboard
6. You review each fix (diff + screen-reader before/after + confidence) and apply or dismiss — **nothing auto-applies**
7. Export patched HTML / JSON report

## Score

`100 − Σ severity penalties` over open issues — critical 10, serious 6, moderate 3, minor 1. Weights live in `backend/src/config.ts`.

## Trust model for AI fixes

- Vision reads the **actual image**, never guesses from the filename
- Every AI fix carries a confidence; `< 0.6` is flagged **needs review**
- Invalid model output → one retry → rule-based placeholder, flagged
- Human approval required for every fix
# A11y-Auto-Fixer
