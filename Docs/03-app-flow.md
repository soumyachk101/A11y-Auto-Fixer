# 03 — App Flow

**Product:** AccessLens
Describes end-to-end user journeys, screen transitions, the scan/fix lifecycle, and edge cases. Diagrams use Mermaid (render on GitHub / most Markdown viewers; readable as text otherwise).

---

## 1. Top-level user journey

```mermaid
flowchart TD
    A[Landing page] -->|enters URL| B{Valid + allowed URL?}
    B -->|no| A2[Inline error: invalid or blocked URL]
    A2 --> A
    B -->|yes| C[Scanning view - live progress]
    C --> D{Scan succeeded?}
    D -->|unreachable| E[Error state: page could not be scanned + retry / paste HTML]
    D -->|yes| F[Results dashboard]
    F --> G[Select an issue]
    G --> H[Issue detail: description + before/after diff + SR simulation]
    H --> I{Action}
    I -->|Apply fix| J[Mark fixed, score updates]
    I -->|Dismiss| K[Mark dismissed]
    I -->|Back| F
    J --> F
    K --> F
    F --> L[Apply all safe fixes]
    F --> M[Export: copy / download patched HTML / report]
```

---

## 2. Screens & transitions

| Screen | Purpose | Enters from | Exits to |
|--------|---------|-------------|----------|
| **Landing** | URL input + value prop | app load | Scanning |
| **Scanning** | Live stage progress (render→scan→analyze→fix) | Landing | Results / Error |
| **Error** | Unreachable/blocked, with retry + paste-HTML | Scanning | Landing / Results |
| **Results dashboard** | Score + prioritized issue list + filters | Scanning | Issue detail / Export |
| **Issue detail** | One issue: context, diff, SR sim, actions | Results | Results |
| **Export** (modal/panel) | Copy fixes / download patched HTML / report | Results | Results |

---

## 3. Scan lifecycle (sequence)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API server
    participant SE as ScanEngine (Playwright+axe)
    participant AI as Claude API
    participant DB as PostgreSQL

    U->>FE: Enter URL, click Scan
    FE->>API: POST /api/scans {url}
    API->>DB: create Scan(status=pending)
    API-->>FE: {scanId, status:pending}
    FE->>API: open WS /ws/scans/:id
    API->>SE: render(url)
    API-->>FE: WS {stage:"rendering"}
    SE->>SE: run axe.run()
    API-->>FE: WS {stage:"scanning"}
    SE-->>API: raw violations + node data
    API->>API: parse + prioritize
    API->>DB: insert Issues
    API-->>FE: WS {stage:"analyzing", issueCount}
    loop each fixable issue
        alt contrast / lang / structure
            API->>API: deterministic fix
        else alt-text / aria
            API->>AI: generate fix (vision or LLM)
            AI-->>API: fix JSON
        end
        API->>DB: insert Fix
        API-->>FE: WS {stage:"fixing", done/total}
    end
    API->>DB: Scan(status=complete, scoreBefore)
    API-->>FE: WS {stage:"complete"}
    FE->>API: GET /api/scans/:id/issues
    API-->>FE: issues + fixes
    FE->>U: Render dashboard
```

---

## 4. Fix generation decision flow

```mermaid
flowchart TD
    V[axe violation] --> C{Category}
    C -->|image-alt| ALT[Vision: read image + context]
    ALT --> ALTD{Decorative?}
    ALTD -->|yes| E1[alt=""]
    ALTD -->|no| E2[Descriptive alt < 125 chars]
    C -->|label / name| ARIA[LLM: generate minimal ARIA/label]
    C -->|color-contrast| CON[Deterministic: compute nearest AA color]
    C -->|html-has-lang| LANG[Rule: insert lang attr]
    C -->|heading-order / region| STR[Rule: suggest corrected structure]
    E1 --> OUT[Fix record: original + fixed + type + confidence]
    E2 --> OUT
    ARIA --> OUT
    CON --> OUT
    LANG --> OUT
    STR --> OUT
    OUT --> REV[Shown to user with before/after + approve]
```

> Contrast/lang/structure are instant (no network). Only alt-text and ARIA hit the AI — keeps the scan fast and the AI spend low.

---

## 5. Apply-fix flow

```mermaid
flowchart LR
    A[User clicks Apply on a fix] --> B[POST /api/issues/:id/apply]
    B --> C[Issue.status = fixed]
    C --> D[Recompute scoreAfter from remaining open issues]
    D --> E[Return updated issue + new score]
    E --> F[UI: item collapses to 'fixed', score badge animates up]
```

The corrected code is also added to the "patched HTML" export set, so applied fixes accumulate into the final downloadable output.

---

## 6. Screen-reader simulation flow (demo centerpiece)

```mermaid
flowchart TD
    A[User opens an image/control issue] --> B[Compute 'before' announcement]
    B --> B1["e.g. 'image' or 'unlabeled button'"]
    A --> C[Compute 'after' announcement from the fix]
    C --> C1["e.g. 'Golden retriever catching a frisbee, image'"]
    B1 --> D[Render two labeled players: Before / After]
    C1 --> D
    D --> E{User action}
    E -->|Play Before| F[Speak via Web Speech API / show caption]
    E -->|Play After| G[Speak fixed announcement]
    E -->|Apply fix| H[Fix applied, After becomes the live state]
```

Implementation note: the "announcement" is derived from accessible-name computation (alt text, label, role). Use the browser **Web Speech API** (`speechSynthesis`) for audio, and always show a text caption too (so it works muted / on any device, and is itself accessible).

---

## 7. Edge cases & error states

| Case | Behavior |
|------|----------|
| Invalid URL format | Inline validation on Landing; don't submit |
| Blocked URL (localhost/private IP) | Reject with clear message (SSRF guard) — never scan |
| Page unreachable / timeout | Error state with Retry + "paste HTML instead" (P1) |
| Page has **zero** violations | Celebrate: "No detectable issues 🎉" + note automated tools catch ~30–50% of WCAG, recommend manual testing |
| Image can't be fetched for vision | Fall back to context-based alt guess, flag low confidence |
| AI returns invalid JSON | Retry once → else rule-based placeholder fix, flagged "needs review" |
| Very large page (100s of issues) | Cap fix generation to top N by priority in MVP; list all detected, fix the important ones |
| User applies then wants to undo | Toggle back to open; recompute score |
| Network drops mid-scan | WS reconnect; if job done, fetch results; else show retry |

---

## 8. State model (frontend)

```
appState:
  view: 'landing' | 'scanning' | 'error' | 'results'
  scan: { id, url, status, stage, scoreBefore, scoreAfter, pageTitle } | null
  issues: Issue[]           // each with its Fix
  filters: { severity?, category?, status? }
  selectedIssueId: string | null
```

Transitions are driven by WS `stage` events during scanning and by REST responses for actions. Keep it in a single store (Zustand) so the score badge, list, and detail stay in sync.
