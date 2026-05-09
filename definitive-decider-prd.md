# The Definitive Decider — Product Requirements Document

> **Decide with weights, not vibes. Escape the Matrix.**

**Status:** v2 (build-ready)
**Last updated:** April 20, 2026
**Build target:** Next.js (App Router), deployed on Vercel free tier.
**Design reference:** Glassmorphism — warm neutrals, frosted translucent surfaces, dark pill buttons, single orange accent.

---

## 1. Overview

### 1.1 Problem
People make important decisions — choosing tools, jobs, apartments, vendors, features — by vibes or lopsided pros/cons lists that don't account for what actually matters most. Spreadsheets can do weighted scoring, but the setup friction kills it for a ten-minute decision.

### 1.2 Solution
A single-page web tool that runs the weighted-scoring-matrix technique as a 90-second interaction. Name the decision, list options, list factors, weight the factors, score each cell, watch a winner emerge live. No accounts, no backend, no save button. State is ephemeral by design — captured into a shareable URL only when the user explicitly hits Share.

### 1.3 Product identity
- **Name:** The Definitive Decider
- **Tagline:** *Decide with weights, not vibes. Escape the Matrix.*
- **Tone:** Useful, a little wry, confident. Not corporate, not cutesy.

### 1.4 Non-goals
- No accounts, no login, no cloud sync.
- No persistence of any kind — not even `localStorage`. Refresh resets everything unless you're on a shared URL.
- No real-time collaboration.
- No AI suggestions for options, factors, weights, or scores. The user owns the reasoning.
- No landing page. Users drop straight into the tool.

### 1.5 Target users
Knowledge workers, job seekers, PMs, founders — anyone whose next decision has 2–6 options and 3–8 factors and who wants a quick, structured way to pressure-test their gut.

---

## 2. Goals & Success Metrics

### 2.1 Product goals
1. Time-to-first-winner under 90 seconds from a cold load.
2. Every input change reflects in results within one frame.
3. A shared link reproduces exact matrix state for the recipient.
4. Share links generate a rich preview card (OG image) showing the decision title and winner.
5. Zero infrastructure cost on Vercel free tier under realistic traffic.

### 2.2 Success signals (informal — no analytics in v1)
- A returning user can rebuild a recent decision quickly even without saved state.
- Shared links open identically across browsers and show a readable preview in Slack / Twitter / iMessage.
- The winner is identifiable within one second of a glance.

---

## 3. User Stories

**Core flow**
- As a user, I can name the decision so the matrix has context.
- As a user, I can add, rename, and remove options so the matrix reflects my real choices.
- As a user, I can add, rename, and remove factors so I'm evaluating against what matters.
- As a user, I can set a weight per factor so important factors count more.
- As a user, I can score each option against each factor.
- As a user, I can leave cells empty and still see meaningful running scores.
- As a user, I can see each option's total and the overall winner update live.

**Sharing & export**
- As a user, I can click Share to copy a URL that fully encodes my matrix.
- As a recipient, when I open a shared link I see the exact matrix the sender saw.
- As a sharer, when I paste the link in Slack/Twitter/iMessage, it shows a rich preview with the decision title and winner.
- As a user, I can export my matrix as a PNG to paste into notes, a doc, or a message.

**Edge cases**
- As a user, if I switch scales, my existing scores auto-rescale so my intent is preserved.
- As a user, if I refresh accidentally, my work is lost (by design) and the app returns to a fresh matrix.
- As a user, if I land on a malformed shared URL, I get a clean fallback — not a broken UI.

---

## 4. Functional Requirements

### 4.1 Decision title
- Single editable text field near the top, placeholder *"What are you deciding?"*
- Max length 120 characters.
- Empty allowed. Used as the OG preview title when populated; falls back to "The Definitive Decider" otherwise.

### 4.2 Options (rows)
- Add, rename inline, delete.
- Soft cap: 10 options. Beyond that, a gentle inline warning; no hard block.
- Starting state on `/`: **2 empty option rows** with placeholder names "Option A", "Option B" — editable on click. This respects "drop straight into the matrix" without showing a hostile blank grid.
- Deleting an option removes its scores. Confirm inline only if any of its cells have non-null scores.

### 4.3 Factors (columns)
- Add, rename inline, delete.
- Soft cap: 8 factors.
- Starting state: **3 empty factor columns** labeled "Factor 1", "Factor 2", "Factor 3", each with default weight 5.
- Deleting a factor removes that column of scores. Same confirm rule as options.

### 4.4 Factor weights
- Integer slider 1–10 per factor, default 5.
- The numeric value is always visible next to the slider in a muted style.
- Changing a weight recomputes all totals and the winner in the same frame.

### 4.5 Scoring scale
- Header toggle: **1–5** (default) or **1–10**.
- **Auto-scale on toggle:**
  - 1–5 → 1–10: multiply every non-null score by 2.
  - 1–10 → 1–5: divide every non-null score by 2 and round to the nearest integer (halves round up).
- A small inline notice confirms the rescale so the user isn't surprised: *"Scores rescaled for the new range."*

### 4.6 Score cells (null vs zero)
This distinction matters for fair running totals.
- A cell accepts integers within the active scale, **or empty**.
- An **empty** cell is stored as `null` — "not yet scored." It is **excluded** from both the numerator and the max-possible denominator.
- A literal **`0`** is stored as `0` — "scored, and it's zero." It's included in both.
- UI treatment: empty cells render as a subtle dashed outline with no number; scored cells (including 0) render the number in a solid cell.
- Non-numeric input is rejected. Out-of-range input is clamped.

### 4.7 Score calculation
For each option:
- `total = Σ (score × weight)` across factors where `score !== null`.
- `max_possible = scale_max × Σ (weights where score !== null)`.
- `normalized = total / max_possible`, shown as a percentage (0–100%).
- If an option has no scored cells, `total = 0`, `max_possible = 0`, and `normalized` is displayed as `—` (em dash), not `NaN` or `0%`.

### 4.8 Winner
- Winner is the option with the highest **normalized** score (not raw total — otherwise options with more filled cells unfairly dominate).
- Winner row gets the orange accent treatment: warm orange tint, a small starburst/sun icon (matches the brand reference), and a "Top pick" label.
- **Ties:** all tied options get the same highlight with label *"Tied for top pick"*. Do not arbitrarily pick one.
- **Incomplete matrix notice:** if any cell is `null`, show a small muted line under the matrix: *"Some cells are empty — fill them in for a fairer comparison."*
- No winner is shown when there are fewer than 2 options or fewer than 1 factor, or when no option has any scored cells.

### 4.9 Share
- Share button in the header. On click:
  1. Serialize state (see §7.3) and encode into a `?m=` query param.
  2. Copy the full URL to the clipboard via the Clipboard API.
  3. Show a transient toast: *"Link copied."*
  4. **Do not** push the URL to the browser history (`history.replaceState` is *not* called). The user's address bar stays on `/`. This keeps the "refresh resets" model consistent — only recipients of the copied link see the encoded state.
- Fallback for browsers that block Clipboard API: show a small popover with the URL in a selectable input and a "Select all" button.
- **On load with `?m=...`:** hydrate state from the URL, render normally. Refreshing this URL preserves the matrix (it's the same URL). Editing after hydrating does not update the URL; the address bar still shows the original shared link until the user clicks Share again.

### 4.10 Open Graph preview (rich link previews)
When a share link is pasted into Slack, Twitter, iMessage, etc., the preview card shows:
- The decision title (or "The Definitive Decider" if untitled).
- The current winner's name + normalized score.
- The tagline as a subtitle.
- The brand orange accent.
Implemented via Next.js dynamic OG image generation (`@vercel/og`) — see §7.4.

### 4.11 Export (PNG)
- "Export as image" action in the header menu.
- Renders the matrix area to a PNG via `html-to-image` (or equivalent).
- Filename: slug of the decision title, e.g. `choosing-a-design-tool.png`. Falls back to `decider.png`.
- Editing UI (delete buttons, add buttons, sliders) is hidden in the export; values render as static text with the winner highlight preserved.
- **PDF export:** not required for v1. Candidate for v1.1.

### 4.12 Reset
- "Start over" action clears local state to the default starter grid (2 options, 3 factors, empty scores). Confirms if any cell is non-null or any name has been edited.
- Does not affect anyone holding a previously shared URL.

---

## 5. UX / UI Requirements

### 5.1 Layout
Single page. Top-to-bottom:
1. **Header bar** (sticky): wordmark "The Definitive Decider" on the left; scale toggle, Share, Export menu, and a compact "Start over" on the right.
2. **Title row:** large editable decision title; tagline shown in small muted type beneath it until the user starts typing a title, then the tagline fades out.
3. **Matrix card:** the glass surface containing the grid.
4. **Footer:** a single line, *"Your data never leaves your browser. Shared links contain your matrix."*

### 5.2 Default state
No landing page. Users land directly on the matrix with the 2×3 starter skeleton (see §4.2, §4.3). Placeholder names are visibly placeholder (muted, italic) so it's obvious where to type.

### 5.3 Visual design system

**Background**
- Base: warm off-white `#FAF7F2` (confirm in implementation — adjust to taste against the reference).
- Subtle body background: a single soft radial gradient blob in the upper-right, low-saturation warm gray, to give depth without distraction.

**Glass surface (the matrix card and any secondary panels)**
- Background: `rgba(255, 255, 255, 0.55)`
- Backdrop filter: `blur(20px) saturate(1.1)`
- Border: `1px solid rgba(255, 255, 255, 0.6)` (inner highlight)
- Shadow: `0 8px 32px rgba(20, 15, 10, 0.06)`
- Border radius: `24px`

**Winner accent (the one orange)**
- Primary orange: `#F97316` (or pick a warmer hue like `#FF7A3D` to match the reference sphere — confirm against the mock).
- Used for: winner row tint (use at ~12% opacity as background wash), winner icon fill, and the primary Share button.
- Nothing else in the UI uses orange. Keep it scarce so the winner always reads as "the thing."

**Buttons**
- Dark pill (primary actions like Share): background `#0F0F0F`, text white, border-radius `999px`, comfortable horizontal padding, subtle `0 2px 8px rgba(0,0,0,0.15)` shadow.
- Light pill (secondary like Export, Start over): `rgba(255,255,255,0.8)` background with `1px solid rgba(0,0,0,0.08)` border, dark text.
- Orange pill (Share, once something is worth sharing): orange background, white text. Falls back to dark pill if the matrix is still blank.

**Inputs**
- Inline text inputs (titles, option names, factor names): no visible border until hover/focus; on focus, a soft inner shadow and a 1px border in a neutral warm gray.
- Score inputs: compact, centered, tabular-numeral, `12px` radius.
- Sliders: minimal track, filled portion in dark gray, handle as a small circle. Weight number visible to the right.

**Typography**
- Font stack: `Helvetica Neue, Helvetica, Arial, sans-serif`. (Helvetica Neue is a system font on macOS/iOS; Helvetica on other systems. No web font fetch required — good for performance and privacy.)
- Decision title: ~48px, regular weight, tight letter-spacing.
- Section headers / factor names: ~16px, medium weight.
- Body / option names: ~16px, regular.
- Numbers (scores, totals, weights): `font-variant-numeric: tabular-nums` so columns align.
- Muted text: `#6B6B68` (warm gray), not true gray — keeps the palette warm.

**Iconography**
- `lucide-react`: Share2, Download, Plus, X, Trash, Sun (or Sparkle) for the winner, ChevronDown for the export menu.
- Winner icon can be a custom small "starburst" SVG to match the sun motif in the reference — nice-to-have.

### 5.4 Interaction details
- All inputs editable in place — click to type, Tab to advance.
- Delete (row/column) buttons: small `×` that appears on row/column hover (desktop) or is always visible (touch).
- No modal dialogs. All confirms are inline and lightweight.
- Adding a row/column animates in with a subtle fade (120ms), removing with a fade out.
- Dragging to reorder is **out of scope** for v1.

### 5.5 Responsiveness
- Works on viewports down to 360px wide.
- On narrow screens, the grid becomes horizontally scrollable; the option-name column is sticky left.
- Touch targets ≥44px.
- Header collapses its secondary actions into an overflow menu below ~640px.

### 5.6 Accessibility
- All inputs have associated labels (visible or `aria-label`).
- Winner indicator uses color **and** icon **and** text label ("Top pick"), so color is never the only signal.
- Contrast meets WCAG AA. The warm neutral on off-white needs a contrast check — pure `#FAF7F2` body text against glass might fail; body text should be `#1A1A1A` or darker.
- Full keyboard operability: add/remove rows and columns must be reachable via keyboard.
- Respect `prefers-reduced-motion` for fade animations.

---

## 6. Technical Architecture

### 6.1 Stack
- **Next.js 14+ with App Router**, TypeScript.
- **Tailwind CSS** for styling. Custom values (colors, radii) defined in `tailwind.config.ts`.
- **lucide-react** for icons.
- **html-to-image** for PNG export.
- **@vercel/og** for dynamic OG image generation.
- **No database. No auth. No third-party API calls at runtime.**

### 6.2 Project structure (suggested)
```
app/
  page.tsx                // The matrix UI (client component)
  layout.tsx              // Metadata, fonts, wordmark
  api/og/route.tsx        // Dynamic OG image endpoint
lib/
  state.ts                // Types, default state, reducers
  encode.ts               // URL encode/decode + validation
  score.ts                // Score, normalize, winner logic
components/
  Matrix.tsx
  OptionRow.tsx
  FactorHeader.tsx
  ShareButton.tsx
  ExportMenu.tsx
  ScaleToggle.tsx
```

### 6.3 State model

```ts
type ScoreCell = number | null;

type Option = {
  id: string;      // nanoid(6)
  name: string;
};

type Factor = {
  id: string;      // nanoid(6)
  name: string;
  weight: number;  // 1–10
};

type Matrix = {
  title: string;
  scale: 5 | 10;
  options: Option[];
  factors: Factor[];
  scores: Record<string, Record<string, ScoreCell>>; // scores[optionId][factorId]
};
```

- IDs are stable across edits — renaming an option doesn't orphan its scores.
- All mutations go through typed reducer-style handlers to keep score wiring consistent.
- State lives in a single `useReducer` in `app/page.tsx`. No global state library needed.

### 6.4 URL encoding
Strategy:
1. `JSON.stringify(state)` — omit any `null` score cells from the serialized object (shrinks URL significantly for sparse matrices).
2. Compress with `lz-string` (`compressToEncodedURIComponent`) — produces URL-safe output without extra encoding.
3. Set as `?m=` query param.

On load:
1. Read `?m=`, decompress, parse, validate shape with a small schema check.
2. On invalid/malformed: fall back to the default starter state and show a dismissible toast: *"Couldn't load that link — starting fresh."*

URL only updates on Share — never on edit. This matches the "refresh resets" design and keeps the address bar clean. **Tradeoff:** the author loses work on accidental refresh. If this bites in practice, consider adding `history.replaceState` on Share click so the address bar reflects the shareable URL, giving the author an easy "refresh to restore."

### 6.5 OG image endpoint (`/api/og`)
- Edge runtime (`export const runtime = 'edge'`).
- Reads `?m=` from the request, decodes matrix state, computes the winner, renders a 1200×630 PNG via `@vercel/og`'s `ImageResponse`.
- Layout: warm off-white background, decision title in large Helvetica, winner name + normalized score in orange, tagline at the bottom.
- Metadata in `layout.tsx` (or `generateMetadata` on `page.tsx`) wires up `og:image` pointing to `/api/og?m=...` with the same encoded state.
- Rate considerations: edge functions on Vercel hobby tier are generous; this route only runs when a link preview is fetched, not on every page view.

### 6.6 Performance
- No network calls at runtime on the main page.
- 10 × 8 = 80 cells. Recalculation is O(options × factors) — trivial.
- No heavy memoization needed; standard React hooks are fine.

### 6.7 Explicitly not used
- **No `localStorage` or `sessionStorage`** — by design.
- **No cookies.**
- **No database, no KV store, no backend state.**
- **No analytics in v1.** (Vercel Analytics can be added later with one env var if desired; leave it off for now.)

---

## 7. Deployment

### 7.1 Vercel setup
- Connect the GitHub repo to Vercel.
- Framework preset: Next.js (auto-detected).
- No environment variables required for v1.
- Free tier ("Hobby") is sufficient: traffic is static-page-plus-edge-OG, no serverless DB, no background jobs.

### 7.2 Domain
- Default: `<project>.vercel.app`.
- Custom domain is optional and can be added post-launch without code changes.

### 7.3 Metadata & favicon
- `<title>`: "The Definitive Decider"
- `<meta description>`: "Decide with weights, not vibes. A quick weighted-scoring tool for real decisions."
- Default OG image at `/api/og` (no `?m` param — shows the wordmark and tagline).
- Favicon: a small orange starburst on off-white. Placeholder acceptable for v1.

---

## 8. Non-Functional Requirements

- **Privacy:** no data leaves the browser except when the user deliberately copies and shares a URL (which contains the matrix state). Footer text makes this explicit.
- **Reliability:** the app must never show `NaN`, `Infinity`, or blank totals. Defensive defaults everywhere.
- **Portability:** a shared URL must work in any modern browser without setup.
- **Cost:** runs within Vercel free tier under realistic traffic. No services with free-tier cliffs.

---

## 9. Out of Scope (v1)

- Accounts, saved matrices, history.
- Real-time collaboration or comments.
- AI suggestions.
- CSV import/export.
- PDF export (stretch for v1.1).
- Dark mode.
- Drag-to-reorder rows and columns.
- Cell-level notes or rationales.
- Sensitivity analysis ("what if I changed this weight?").

## 10. Future (v1.1+)

- PDF export with a print-friendly layout.
- Per-cell notes (hover or expand).
- "Why this won" explainer — which factors drove the winner's lead.
- Sensitivity slider — see how weight changes move the winner.
- Named presets for common decision types (hiring, tool choice, apartments).
- Dark mode.
- Optional `localStorage` autosave (opt-in, not default).

---

## 11. Open Questions (minimal — most decisions are locked)

1. **Accidental refresh:** should we push the shareable URL to the address bar on Share click (giving the author a refresh-to-restore path)? Current spec says no, but this is the most likely paper-cut. Worth a check post-first-build.
2. **Orange hue:** the spec uses `#F97316` as a default — final hue should be picked against the actual reference image to match the warm sphere in the mock.
3. **Tie-visual:** ties get the same orange highlight for all tied options. Confirm this reads well when 3+ options tie (edge case, but worth eyeballing).

---

## 12. Acceptance Checklist (ship criteria)

- [ ] Cold load at `/` → 2×3 starter grid, editable, under 1s first paint.
- [ ] User can title the decision, add/remove/rename options and factors, set weights, score cells, and see a winner highlighted — all in under 90 seconds on a first attempt.
- [ ] Empty cells (`null`) are visually distinct from scored-zero cells and are excluded from both numerator and max-possible denominator.
- [ ] Scale toggle rescales existing scores (×2 or ÷2, rounded) and shows the inline confirmation.
- [ ] Totals, normalized scores, and winner update within one frame of any input change.
- [ ] Ties render all tied options as "Tied for top pick" — no arbitrary selection.
- [ ] Share button copies a working URL; pasting it in incognito reproduces state exactly.
- [ ] Pasting a share link in Slack/Twitter shows a rich OG preview with the decision title and winner.
- [ ] Malformed `?m=` param degrades gracefully with a toast and a fresh starter grid.
- [ ] PNG export renders a clean, legible image with the winner preserved and editing UI hidden.
- [ ] Works on 360px-wide viewport; option column sticky; touch targets ≥44px.
- [ ] Full keyboard operability: add option, add factor, set weight, score, read total — no mouse required.
- [ ] No `localStorage`, `sessionStorage`, cookies, or third-party network calls at runtime.
- [ ] Lighthouse accessibility score ≥95.
- [ ] Deploys to Vercel free tier with zero paid services.
