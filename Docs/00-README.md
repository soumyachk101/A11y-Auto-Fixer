# AccessLens — Documentation Suite

> **Working name:** AccessLens · rename freely
> **Tagline:** *Find it. Fix it. Ship accessible.*
> **One-liner:** An AI-powered accessibility tool that scans any website for WCAG violations and **generates the actual code fixes** — not just a report, but one-click applicable corrections with a before/after screen-reader preview.

This folder is the complete planning + build spec for a hackathon MVP. It is written to be **fed directly into an AI coding agent** (Claude Code, Cursor, etc.) as context. Read `07-ai-instructions.md` first if you're an AI agent building this.

---

## The 30-second pitch

Tools like axe, Lighthouse and WAVE **tell you** what's broken. They hand a developer a list of 200 violations and walk away. Most of those never get fixed — because writing good alt text, correct ARIA, and WCAG-compliant colors is tedious manual work.

**AccessLens closes the loop.** It detects the violations *and* writes the fix:
- AI reads the actual image (vision) and writes meaningful alt text
- AI generates correct ARIA / semantic HTML for unlabeled controls
- Deterministic math suggests the nearest WCAG-compliant color
- You see a **before/after screen-reader simulation** and apply the fix in one click

Accessibility isn't a niche — **1 in 6 people** live with a disability. This tool helps developers *and* every user who relies on assistive tech.

---

## Why this wins a hackathon

| Judge question | Our answer |
|---|---|
| "Is this a real problem?" | 96%+ of top websites fail WCAG; accessibility lawsuits rising every year |
| "How is this different from axe/Lighthouse?" | They **detect**; we **detect + auto-fix** with AI |
| "Does it help everyone?" | Developers save hours; disabled users get accessible sites — dual impact |
| "Show me the wow" | Live screen-reader: *before* = silence/"image", *after* = "Golden retriever catching a frisbee" |
| "Is the AI reliable?" | Contrast is deterministic math; AI fixes show confidence + before/after preview + human approval |

---

## Document map

| # | File | What it covers | Read if you're… |
|---|------|----------------|-----------------|
| 00 | `00-README.md` | This index + shared product definition | Everyone |
| 01 | `01-PRD.md` | Product requirements: problem, users, features, scope, demo | Product / pitch |
| 02 | `02-TRD.md` | Technical requirements: architecture, stack, phases, risks | Engineers |
| 03 | `03-app-flow.md` | End-to-end user flows + sequence diagrams | Engineers / design |
| 04 | `04-backend-schema.md` | REST API contract (endpoints, request/response JSON) | Backend |
| 05 | `05-database.md` | Data model, Prisma schema, indexes | Backend |
| 06 | `06-ui-ux.md` | Design system, screens, components, self-accessibility | Frontend / design |
| 07 | `07-ai-instructions.md` | How to build with an AI agent + production AI-feature prompts | AI agent / AI features |

---

## Canonical tech stack (used consistently across all docs)

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Scan engine:** `axe-core` (WCAG rules) run inside **Playwright** (headless Chromium)
- **AI fixes:** Anthropic Claude API (vision for alt text, LLM for ARIA/semantic fixes)
- **Deterministic fixes:** WCAG contrast-ratio math (no AI needed for color)
- **Database:** PostgreSQL + Prisma ORM (SQLite acceptable for a pure-hackathon build)
- **Jobs:** in-process async for MVP (optional BullMQ + Redis for scale)
- **Deploy:** Vercel (frontend) + Render/Railway (backend)

---

## Scope at a glance (full detail in PRD)

**P0 — MVP (must demo):** URL scan → prioritized issue list → AI alt text + ARIA fixes + contrast suggestions → before/after diff → **screen-reader simulation** → export fixes.

**P1 — if time:** paste-HTML scan, impact-based prioritization, bulk-apply, accessibility score before/after, report export.

**P2 — stretch:** GitHub PR integration, browser extension, multi-page crawl, continuous monitoring.

---

## Suggested 7-day build order

1. **Day 1** — Scaffold repo, scan engine (Playwright + axe-core) returning raw violations
2. **Day 2** — Parse + prioritize issues, DB persistence, list API
3. **Day 3** — AI alt-text (vision) + contrast fixes (deterministic)
4. **Day 4** — AI ARIA/semantic fixes + before/after diff API
5. **Day 5** — Frontend: URL input, scanning, results dashboard, issue detail
6. **Day 6** — **Screen-reader simulation** + export + polish + deploy
7. **Day 7** — Rehearse demo, fix bugs, write README + record backup demo video

> Golden rule for the build: **one feature at a time, verify, then next.** Don't build all P0 at once.
