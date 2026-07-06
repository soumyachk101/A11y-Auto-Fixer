# 07 — AI Instructions

This file has **two parts**:
- **Part A** — instructions for the **AI coding agent** (Claude Code / Cursor) that will *build* AccessLens.
- **Part B** — the **production prompts** for the app's own AI features (alt-text, ARIA fixes) + how to call the Anthropic API.

---

# Part A — Building AccessLens with an AI agent

## A1. How to use these docs
Read them in this order: `00-README` (product + stack) → `01-PRD` (scope) → `02-TRD` (architecture) → `04-backend-schema` (API contract) → `05-database` (data model) → `03-app-flow` (flows) → `06-ui-ux` (frontend). Treat `04` and `05` as the **contract** — don't invent different field names.

## A2. Build order (one feature at a time — verify before moving on)
1. Backend scaffold (Express + TS + Prisma) + `GET /api/health`.
2. **ScanEngine**: Playwright renders a URL, injects axe-core, returns raw violations. Prove it in a script against a real page before wiring HTTP.
3. IssueParser + Prioritizer + persist Issues; `POST /api/scans`, `GET /api/scans/:id`, `GET /api/scans/:id/issues`.
4. FixGenerator: **contrast (deterministic) first**, then **alt-text (vision)**, then **ARIA (LLM)**.
5. WebSocket progress.
6. Frontend: Landing → Scanning → Results → Issue detail → SR simulation → Export.
7. SSRF guard, deploy, seed demo data.

## A3. Conventions the agent must follow
- **TypeScript strict mode** on both sides. No `any` unless justified.
- Match the **API shapes in `04`** and **field names in `05`** exactly.
- Services are pure/testable; controllers are thin.
- **Never** put the Anthropic API key in the frontend or in any committed file. Server-side only, from `process.env.ANTHROPIC_API_KEY`.
- All AI calls go through **one wrapper** (`lib/anthropic.ts`) so retries, JSON parsing, caching, and cost controls live in one place.
- **Deterministic-first:** never use AI for anything computable (contrast ratio, attribute presence, lang). See `01-PRD §7`.
- Handle failure: an AI/API error must **degrade to detection-only for that issue**, never crash the scan.
- Validate and SSRF-guard every user URL **before** launching the browser (`02-TRD §7`).
- Keep scoring weights in one constants file so the demo number is explainable.

## A4. What NOT to do
- Don't auto-apply AI fixes without user approval.
- Don't store secrets, don't log full page HTML or API keys.
- Don't fabricate alt text describing things not in the image.
- Don't scan localhost/private IPs.
- Don't build all features at once — ship and verify incrementally.

## A5. Testing
- Unit: contrast math (known pairs → known ratios), prioritizer ordering, issue parser mapping.
- Integration: scan a known fixture page → expect specific violations.
- AI: snapshot the *shape* of outputs (valid JSON, alt length ≤ 125), not exact wording.

---

# Part B — The app's AI features

Two AI features only. Everything else is deterministic.

| Feature | Model type | Input | Output |
|---------|-----------|-------|--------|
| Alt-text generation | **vision** | image + page context | `{alt, decorative, confidence}` |
| ARIA / label fix | **text** | element HTML + DOM context | `{fixedHtml, explanation, confidence}` |

> **Model choice:** use a current **Claude Sonnet-class** model — good quality/latency/cost balance and it supports vision. Model IDs change over time, so confirm the current ID and capabilities at the official docs rather than hardcoding blindly:
> - API overview: https://docs.claude.com/en/api/overview
> - Models & vision: see the docs map at https://docs.claude.com/en/docs_site_map.md
> Keep the model id in an env var (`ANTHROPIC_MODEL`) so it's swappable.

## B1. Calling the Anthropic API

Use the official SDK (`npm i @anthropic-ai/sdk`). One shared wrapper:

```ts
// lib/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5"; // verify current id in docs

// Enforce JSON output, parse defensively, retry once.
export async function callJson<T>(opts: {
  system: string;
  content: Anthropic.MessageParam["content"];
  maxTokens?: number;
}): Promise<T> {
  const run = async () => {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 300,
      system: opts.system,
      messages: [{ role: "user", content: opts.content }],
    });
    const text = res.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
    return JSON.parse(stripFences(text)) as T;
  };
  try {
    return await run();
  } catch {
    return await run(); // one retry; caller falls back to rule-based on throw
  }
}

function stripFences(s: string) {
  return s.replace(/```json/gi, "").replace(/```/g, "").trim();
}
```

**Vision content block** (image passed as base64):
```ts
const content = [
  {
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: base64Image },
  },
  { type: "text", text: userPromptText },
];
```
(You can fetch the image server-side from `issue.imageUrl`, convert to base64, and pass it. A URL image source may also be supported — check the docs.)

**Cost/latency controls (apply everywhere):**
- `max_tokens` small (alt-text ~150, ARIA ~400).
- Cap concurrent AI calls (e.g. 5) with a simple pool.
- **Cache** by a hash of the input (image bytes / element HTML) → avoid re-paying for identical elements.
- Bound total AI fixes per scan (`MAX_AI_FIXES`).
- On any error after retry: return a rule-based placeholder fix flagged `needs review` — never crash.

---

## B2. Alt-text generation (vision)

**Goal:** produce concise, accurate alternative text for an image that's missing it — or mark it decorative.

**System prompt:**
```
You are an accessibility expert writing alternative text (alt text) for images, following WCAG 2.1.
Rules:
- Describe the image's content and function concisely. Aim for under 125 characters.
- Do NOT start with "image of", "picture of", or "graphic of".
- Convey what matters in context; do not narrate every detail.
- If the image is purely decorative (adds no information, e.g. a divider, background flourish, or spacer), mark it decorative so it can be hidden from screen readers with alt="".
- If text appears in the image and is meaningful, include that text.
- Never invent details you cannot see. If unsure, describe only what is clearly visible and lower your confidence.
Respond ONLY with minified JSON, no prose, no code fences.
```

**User content:** the image (base64 block) + this text:
```
Page title: "{pageTitle}"
Nearby text / caption (if any): "{surroundingText}"
Element: {elementHtml}

Write alt text for this image for the context above.
Return JSON exactly: {"alt": string, "decorative": boolean, "confidence": number between 0 and 1}
If decorative is true, set "alt" to "".
```

**Expected output:**
```json
{"alt":"Golden retriever catching a frisbee on a beach","decorative":false,"confidence":0.92}
```

**Post-processing / guardrails (in code):**
- Truncate/flag if `alt.length > 125`.
- Strip any leading "image of/picture of" defensively.
- If `decorative` → `fixedCode = <img … alt="">`.
- If `confidence < 0.6` → mark the fix `needs review` in the UI.
- Build `srAfter` = `"{alt}, image"` for the screen-reader simulation; `srBefore` = `"image"` (or filename if the SR would read the src).

---

## B3. ARIA / label fix (text)

**Goal:** given an interactive element failing an axe name/label rule, return corrected, minimal markup with a proper accessible name.

**System prompt:**
```
You are an accessibility expert fixing HTML to meet WCAG 2.1 and ARIA best practices.
You are given a single element that fails an accessibility rule and some surrounding DOM for context.
Rules:
- Make the SMALLEST change that fixes the accessible-name / labeling problem.
- Prefer native semantics first: a real <label> for inputs, real text for buttons/links. Use ARIA (aria-label / aria-labelledby) only when native labeling isn't possible.
- Use only valid ARIA roles, states, and properties. Never add redundant or conflicting ARIA.
- Preserve the element's existing attributes, classes, ids, and behavior. Do not restyle or restructure beyond what's needed.
- Infer a sensible accessible name from the surrounding context (nearby text, placeholder, icon meaning). Do not invent unrelated content.
Respond ONLY with minified JSON, no prose, no code fences.
```

**User content:**
```
Failing rule: {ruleId} — {wcagCriterion}
Element: {elementHtml}
Surrounding DOM (for context):
{contextHtml}

Return JSON exactly:
{"fixedHtml": string, "explanation": string, "confidence": number between 0 and 1}
"fixedHtml" is the corrected element (and only what must change). "explanation" is one short sentence.
```

**Expected output:**
```json
{"fixedHtml":"<label for=\"email\">Email address</label><input id=\"email\" type=\"email\">","explanation":"Added an associated label so screen readers announce the field.","confidence":0.88}
```

**Guardrails (in code):**
- Validate `fixedHtml` parses as HTML; if not, retry once → else fallback.
- Sanity-check it didn't drop the original `id`/`name`.
- `srBefore` = e.g. `"unlabeled edit text"` / `"button"`; `srAfter` derived from the new accessible name (e.g. `"Email address, edit text"`).

---

## B4. Contrast fix (DETERMINISTIC — not AI)

Do **not** call the model for contrast. Compute it.

**WCAG contrast ratio:**
```
ratio = (L1 + 0.05) / (L2 + 0.05)   // L1 = lighter, L2 = darker relative luminance
Relative luminance L = 0.2126*R + 0.7152*G + 0.0722*B
where each channel c in [0,1]: c = (c <= 0.03928) ? c/12.92 : ((c + 0.055)/1.055) ^ 2.4
Pass: normal text ≥ 4.5:1, large text (≥18.66px bold or ≥24px) ≥ 3:1
```
**Fix strategy:** keep the background, adjust the foreground toward black/white (or along its own hue, reducing lightness) until the ratio meets the threshold; return the nearest compliant color so it stays close to the original brand color. Provide `originalCode`/`fixedCode` as the CSS/style change. `source = "deterministic"`, `confidence = null`.

Optional AI touch (only if you want): ask the model to pick the nearest *on-brand* compliant color from a provided brand palette — but the pass/fail math stays deterministic.

---

## B5. Output contract summary (what the API returns to the frontend)

Every generated fix — AI or deterministic — is normalized to the `Fix` shape in `05-database.md`:
```
{ fixType, source, originalCode, fixedCode, explanation?, confidence?, decorative?, srBefore?, srAfter? }
```
This uniformity means the frontend's `DiffView` and `SrSimulator` don't care how a fix was produced.

---

## B6. Guardrail recap (the answers to "is the AI reliable?")
- Deterministic wherever possible (contrast, lang, presence checks).
- Vision reads the **actual image**, not a guess from the filename.
- Every AI fix carries a **confidence** and is shown with a **before/after diff** + **screen-reader preview**.
- **Human approval required** — nothing auto-applies.
- Invalid/failed model output → retry once → rule-based fallback flagged "needs review".
- Costs bounded by low `max_tokens`, concurrency cap, caching, and `MAX_AI_FIXES`.
