# 01 — Product Requirements Document (PRD)

**Product:** AccessLens (working name)
**Type:** Web application (dev tool)
**Status:** Hackathon MVP
**Owner:** _you_

---

## 1. Problem statement

The web is inaccessible by default. Studies of the top million homepages consistently find **95%+ have detectable WCAG failures** — missing alt text, unlabeled form fields, low color contrast, broken heading structure, and inaccessible interactive elements.

Existing tools (axe DevTools, Lighthouse, WAVE) are excellent at **detection** but stop there. A developer runs a scan, gets a wall of 150+ issues, and is left to fix each one manually. Writing a good alt-text description, choosing valid ARIA, and finding a compliant color that still matches the brand is slow, requires specialist knowledge, and is the #1 reason issues never get fixed.

**The gap:** nobody closes the loop from *detection* to *correct, ready-to-apply fix*.

---

## 2. Solution

AccessLens scans a website and, for every fixable violation, **generates the actual code fix** using a mix of AI and deterministic logic:

- **Missing alt text** → Claude vision reads the real image and writes concise, descriptive alt text
- **Unlabeled controls / bad ARIA** → Claude generates correct, minimal ARIA / semantic HTML
- **Low contrast** → WCAG contrast math computes the nearest compliant color (deterministic)
- **Structure issues** (headings, landmarks) → rule-based suggestions with corrected markup

The developer reviews each fix with a **before/after code diff** and a **screen-reader simulation**, then applies it or exports the corrected code.

---

## 3. Goals & non-goals

### Goals
- G1 — Detect the most common, highest-impact WCAG 2.1 AA violations on any public URL
- G2 — Generate a **ready-to-apply fix** for each fixable violation, not just advice
- G3 — Make the fix **trustworthy**: show before/after, a confidence signal, and require human approval
- G4 — Demonstrate real user impact via a **screen-reader before/after** experience
- G5 — Be usable end-to-end in under 60 seconds for a single page

### Non-goals (for the hackathon)
- N1 — Not a full WCAG audit/certification tool (we cover common automatable rules, not all 78 criteria)
- N2 — Not a replacement for manual testing by real assistive-tech users
- N3 — No account/billing/team management in MVP
- N4 — Not fixing server-rendered app *source* automatically across a repo (we fix the rendered HTML / provide snippets; repo-PR is a stretch goal)

---

## 4. Target users & personas

**Persona A — "Frontend Dev Priya"** (primary)
Ships features fast, knows accessibility matters but isn't a specialist. Wants to fix issues without reading the WCAG spec. Values: speed, correct code she can paste in.

**Persona B — "Agency Owner Arjun"**
Delivers client sites, gets dinged in audits. Wants a quick pass + a report showing improvement. Values: before/after score, exportable report.

**Persona C — "The end user with a disability"** (the person we ultimately serve)
Uses a screen reader / keyboard / needs high contrast. Doesn't touch the tool, but every fix directly improves their experience. This is our *impact* story.

---

## 5. User stories

**Scanning**
- As a dev, I can enter a URL and get a list of accessibility issues within ~30s.
- As a dev, I can see each issue's severity, the WCAG criterion it violates, and the exact element affected.

**Fixing**
- As a dev, for an image missing alt text, I get AI-generated alt text describing the actual image.
- As a dev, for an unlabeled input, I get corrected HTML with proper labels/ARIA.
- As a dev, for a low-contrast element, I get a compliant color that stays close to the original.
- As a dev, I can view a before/after diff of the code for any fix.
- As a dev, I can hear/read what a screen reader announces *before* vs *after* the fix.
- As a dev, I can apply a fix (mark resolved) or dismiss it.

**Exporting**
- As a dev, I can copy an individual fix or export all fixes as patched HTML.
- As an agency owner, I can export a before/after accessibility report. *(P1)*

---

## 6. Features & priority

### P0 — MVP (must be in the demo)
| ID | Feature | Notes |
|----|---------|-------|
| F1 | URL scan (Playwright + axe-core) | Renders the page in headless Chromium, runs axe |
| F2 | Issue list + detail | Severity, WCAG ref, element selector + HTML, description |
| F3 | Prioritization | Sort by severity × user impact |
| F4 | AI alt-text generation | Vision model reads image, writes alt (<125 chars) |
| F5 | AI ARIA / label fixes | LLM generates minimal correct markup for controls |
| F6 | Contrast fix (deterministic) | WCAG ratio math → nearest compliant color |
| F7 | Before/after code diff | Side-by-side, syntax highlighted |
| F8 | **Screen-reader simulation** | Announce before vs after — **demo centerpiece** |
| F9 | Export fixes | Copy snippet / download patched HTML |

### P1 — if time allows
| ID | Feature |
|----|---------|
| F10 | Scan pasted HTML / uploaded file (not just live URL) |
| F11 | Impact score (est. users affected) driving prioritization |
| F12 | Bulk "apply all safe fixes" |
| F13 | Accessibility score before → after (0–100) |
| F14 | Export before/after report (HTML/PDF) |

### P2 — stretch
| ID | Feature |
|----|---------|
| F15 | GitHub integration — open a PR with fixes |
| F16 | Browser extension (scan the page you're on) |
| F17 | Multi-page crawl |
| F18 | Continuous monitoring / scheduled re-scans |

---

## 7. Fix-type coverage (MVP)

| WCAG issue | axe rule (examples) | Fix strategy | AI? |
|------------|--------------------|--------------|-----|
| Missing image alt | `image-alt` | Vision → descriptive alt; decorative → `alt=""` | ✅ vision |
| Unlabeled form field | `label`, `select-name` | Generate `<label>` / `aria-label` | ✅ LLM |
| Button/link no name | `button-name`, `link-name` | Infer accessible name from context | ✅ LLM |
| Low contrast | `color-contrast` | Compute nearest AA-compliant color | ❌ math |
| Missing lang | `html-has-lang` | Insert `lang="en"` (or detected) | ❌ rule |
| Heading order | `heading-order` | Suggest corrected hierarchy | ❌ rule |
| Missing landmarks | `region` | Suggest semantic wrappers | ❌ rule |
| Missing `alt` on `<area>`/icon | `role-img-alt` | Vision/context | ✅ |

> Deterministic-first principle: **only use AI where judgment/language is required.** Anything computable (contrast, presence of an attribute) is done with code — cheaper, faster, 100% reliable.

---

## 8. Success metrics

**Product metrics**
- Number of issues detected per scan
- % of detected issues that are auto-fixable
- Accessibility score improvement (before → after)
- Time-to-fix vs manual (target: minutes → seconds)

**Demo metrics (what judges feel)**
- The screen-reader before/after moment lands
- A real, well-known site can be scanned live and improved on stage
- Fixes are visibly correct in the diff

---

## 9. Demo script (2 minutes)

1. **Hook (15s):** "1 in 6 people have a disability, and 95% of websites fail them. Existing tools tell you what's broken. Watch this fix it." 
2. **Scan (20s):** Enter a real URL → issues stream in, prioritized. "23 issues, 18 auto-fixable."
3. **Alt text (25s):** Open an image issue → show the actual image → AI-generated alt appears → before/after diff.
4. **Screen-reader moment (30s):** Play SR *before* ("image") → apply fix → play SR *after* ("Golden retriever catching a frisbee at the beach"). **Let it land.**
5. **Contrast + bulk (20s):** Show a contrast fix (compliant color), then "Apply all safe fixes" → score jumps 61 → 89.
6. **Close (10s):** Export patched code / report. "From broken to accessible in under a minute — for developers, and for everyone who uses the web."

---

## 10. Risks & assumptions

| Risk | Mitigation |
|------|------------|
| AI writes wrong/hallucinated alt text | Vision on the actual image + human approval + confidence flag + never auto-apply |
| Some sites block headless browsers | Have a known-good demo URL + paste-HTML fallback (P1) + recorded backup video |
| Scan too slow live | Cache a pre-scanned demo; limit to single page; show progress |
| ARIA fix breaks layout/behavior | Prompt enforces minimal change; show diff; user approves |
| Live network fails on stage | Pre-scanned demo dataset + offline fallback |

**Assumptions:** target pages are public and renderable; single-page scope for MVP; judges value real impact + working demo over feature count.
