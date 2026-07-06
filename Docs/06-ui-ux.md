# 06 — UI / UX

**Product:** AccessLens
**Principle above all:** an accessibility tool **must be accessible**. Every screen here targets **WCAG 2.1 AA**. We dogfood — and showing "AccessLens passes its own scan" is a pitch moment.

---

## 1. Design principles

1. **Clarity over cleverness.** Developers want to scan, understand, fix, leave. Reduce steps.
2. **Trust through transparency.** Always show the before/after and a confidence signal. Never hide that a fix is AI-generated.
3. **Impact made visible.** The screen-reader simulation is the emotional core — give it room.
4. **Accessible by construction.** Keyboard-first, visible focus, semantic HTML, sufficient contrast, respects reduced-motion.
5. **Fast feedback.** Live scan progress; optimistic UI on apply.

---

## 2. Design tokens

### Color (all pairings meet AA; verify with our own contrast math)
```
--bg:            #0F1115   (near-black background)
--surface:       #171A21   (cards/panels)
--surface-2:     #1F242D   (raised)
--border:        #2A303B
--text:          #F2F4F8   (on --bg: ~15:1)
--text-muted:    #A9B2C0   (on --bg: ~7:1)
--primary:       #4F8CFF   (actions)
--primary-ink:   #06122B   (text on primary button — AA)
--success:       #3DD68C   (fixed / good score)
--warning:       #F5B23D   (needs review / demo mode)
--danger:        #FF5C6C   (critical severity)
--focus-ring:    #8AB4FF   (2px, always visible)
```
Severity colors: critical `--danger`, serious `#FF8A3D`, moderate `--warning`, minor `--text-muted`. **Never encode meaning by color alone** — always pair with a text label and/or icon (accessibility requirement + colorblind-safe).

### Typography
```
Font: Inter (or system-ui fallback). Mono: JetBrains Mono / ui-monospace (code + diffs).
Scale: 12 / 14 / 16(base) / 20 / 24 / 32 / 40
Body 16px min, line-height 1.5. Never below 12px. Respect user zoom to 200%.
```

### Spacing & radius
```
Spacing scale: 4 8 12 16 24 32 48 (px)
Radius: 8px (cards), 6px (inputs/buttons), 999px (pills)
Max content width: 1200px; issue detail panel ~ 520px
```

### Motion
```
Transitions 150–200ms ease-out. Score badge count-up ~600ms.
Respect prefers-reduced-motion: reduce → disable non-essential animation.
```

---

## 3. Screen inventory

### 3.1 Landing
- Centered product name + tagline + one-line value prop.
- Large URL input with inline validation + primary "Scan" button.
- Small trust row: "Scans against WCAG 2.1 AA · powered by axe-core + AI".
- Optional: "Try a sample site" button (loads the seeded demo — great for a safe demo).
- Layout: single column, generous whitespace.

```
┌───────────────────────────────────────────────┐
│                  AccessLens                    │
│         Find it. Fix it. Ship accessible.      │
│                                                │
│   ┌───────────────────────────────┐ ┌───────┐ │
│   │ https://your-site.com         │ │ Scan  │ │
│   └───────────────────────────────┘ └───────┘ │
│         or  ▸ Try a sample site                │
│   Scans against WCAG 2.1 AA · axe-core + AI    │
└───────────────────────────────────────────────┘
```

### 3.2 Scanning
- Stage stepper: Rendering → Scanning → Analyzing → Fixing → Done.
- Progress bar (determinate during "Fixing": done/total).
- Live count as issues are found ("18 issues found…").
- Cancel button.
- Use `aria-live="polite"` region so screen readers hear progress.

### 3.3 Results dashboard (the main screen)
Two-pane on desktop; stacked on mobile.

```
┌──────────────────────────────────────────────────────────────┐
│ example.com   ● Score 61 → 89   [Apply all safe] [Export ▾]   │
├───────────────────────────────┬──────────────────────────────┤
│ Filters: [Severity ▾][Type ▾] │  Issue detail                │
│ [Status ▾]                    │  (empty state: "Select an     │
│                               │   issue to see the fix")      │
│ ▸ CRITICAL  Missing alt text  │                              │
│   img · 1.1.1                 │                              │
│ ▸ SERIOUS   Unlabeled input   │                              │
│   input#email · 4.1.2         │                              │
│ ▸ SERIOUS   Low contrast      │                              │
│   .cta · 1.4.3                │                              │
│ ✓ FIXED     Missing lang      │                              │
│ …                             │                              │
└───────────────────────────────┴──────────────────────────────┘
```
- **Score badge**: `before → after`, animated count-up, color by band (red/amber/green) + numeric label (not color alone).
- **Issue row**: severity pill (icon + word), short title, element selector, WCAG ref, status chip. Fixed/dismissed rows visually recede.
- **Filters**: severity, type (FixCategory), status. Keyboard operable.
- **Primary actions**: "Apply all safe fixes", "Export".

### 3.4 Issue detail panel
Selected issue expands here (or a side panel):
1. **Header**: severity + rule + WCAG criterion + "Learn more" (helpUrl).
2. **What & why**: plain-language description of the barrier and who it affects.
3. **Element**: the offending selector + rendered snippet. For images, show the **actual image thumbnail**.
4. **Before/After diff**: two-column, syntax-highlighted, changed parts highlighted. A "copy fixed code" button.
5. **Screen-reader simulation**: two labeled players — **Before** / **After** — each with a Play button and a visible caption of the announcement.
6. **Confidence** (AI fixes): a small badge (e.g. "AI · 92%") + note "review before shipping".
7. **Actions**: `Apply fix` (primary) · `Regenerate` · `Dismiss`.

### 3.5 Export (modal / panel)
- Copy all fixes / Download **patched HTML** (original + applied fixes) / Export report (P1).
- Show what's included ("18 applied fixes").

### 3.6 Empty / error / success states
- **No issues**: celebratory, honest note that automated tools catch ~30–50% of WCAG; recommend manual testing.
- **Unreachable**: clear cause + Retry + "paste HTML instead" (P1).
- **Blocked URL**: explain why (private/localhost not allowed).

---

## 4. Component inventory

| Component | Notes |
|-----------|-------|
| `ScanInput` | URL field + validation + submit; `Try sample` link |
| `StageStepper` | 5-stage progress with `aria-live` |
| `ScoreBadge` | before→after, animated, band color + numeric label |
| `IssueList` | virtualized if large; keyboard arrow navigation |
| `IssueRow` | severity pill, title, selector, WCAG ref, status chip |
| `FilterBar` | severity/type/status selects |
| `IssueDetail` | container for the sections in §3.4 |
| `ImageThumb` | shows the actual image for alt-text issues |
| `DiffView` | side-by-side syntax-highlighted diff + copy |
| `SrSimulator` | Before/After players + captions (Web Speech API) |
| `ConfidenceBadge` | AI source + % |
| `ActionBar` | Apply / Regenerate / Dismiss |
| `ExportPanel` | copy / download / report |
| `Toast` | apply/undo confirmations |
| `ModeBadge` | "Live" vs "Sample/Demo" (honesty about data source) |

---

## 5. Self-accessibility checklist (we must pass these)

- [ ] All interactive elements reachable and operable by **keyboard**; logical tab order.
- [ ] **Visible focus** ring on every focusable element (`--focus-ring`, never `outline:none` without replacement).
- [ ] Semantic landmarks: `header`, `nav`, `main`, `aside`, `footer`.
- [ ] Buttons are `<button>`, links are `<a>`; no click-only `<div>`s.
- [ ] All images/icons have text alternatives; decorative icons `aria-hidden`.
- [ ] Form inputs have associated `<label>`s.
- [ ] Color contrast AA everywhere; meaning never by color alone (pair with text/icon).
- [ ] Live regions (`aria-live`) for scan progress, toasts, score changes.
- [ ] Screen-reader captions always shown as text (audio is enhancement, not requirement).
- [ ] Respects `prefers-reduced-motion` and zoom to 200%.
- [ ] Modal/panel focus trap + `Esc` to close + focus return.

> Add a footer badge: "AccessLens scores 100 on its own scan." Then show it live. Judges love a tool that eats its own dog food.

---

## 6. Responsive behavior

- **Desktop (≥1024px):** two-pane (list + detail).
- **Tablet (640–1023px):** list full-width; selecting an issue opens detail as an overlay panel.
- **Mobile (<640px):** single column; issue detail is a full-screen sheet with a back button; diff scrolls horizontally; SR simulation stacks Before over After.

---

## 7. Micro-interactions

- Apply fix → row animates to "fixed" (collapse + check), score badge counts up, toast with **Undo**.
- Copy code → button flips to "Copied ✓" for 1.5s.
- SR "Play" → button shows playing state + animates the caption (respect reduced-motion).
- Scanning → subtle stage progress; never a frozen blank screen (always show *something* happening).
