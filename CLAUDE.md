# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Next.js dev server
- `npm run build` — production build
- `npm run lint` — `next lint`
- `npm run test` — Vitest, single run
- `npm run test:watch` — Vitest watch mode
- Single test file: `npx vitest run lib/__tests__/score.test.ts`
- Single test by name: `npx vitest run -t "winner by normalized"`

Test runner is Vitest with jsdom. The `@/` path alias maps to the project root (configured in both `tsconfig.json` and `vitest.config.ts`). Tests live under `lib/__tests__/`.

## Architecture

This is **The Definitive Decider** — a single-page weighted-scoring decision tool. Next.js 15 App Router, React 19, TypeScript, Tailwind. **No database, no auth, no `localStorage`, no runtime third-party calls.** (`sessionStorage` is permitted for ephemeral UI state only — currently the "guide-seen" flag — because it does not persist across sessions.) The full product spec lives in [definitive-decider-prd.md](definitive-decider-prd.md) and is the source of truth for behavior decisions — §-numbered references in code comments point back to it.

Runtime deps worth knowing: `lz-string` (URL compression), `nanoid` (stable row/column IDs), `@vercel/og` (edge OG image), `html-to-image` (client PNG export), `lucide-react` (unused at present — icons are inline SVG), `clsx`.

### State flow

All UI state is a single `Matrix` object driven by one `useReducer` in [app/MatrixPage.tsx](app/MatrixPage.tsx). The reducer, types, and domain constants live in [lib/state.ts](lib/state.ts). No global state library.

- `scores` is a sparse 2D map keyed by stable `nanoid(6)` IDs: `scores[optionId][factorId]`. IDs persist across renames so renaming never orphans scores.
- Every mutation is a typed `Action`; UI components dispatch, never mutate state directly.
- A cell is `number | null`. **`null` (unscored) and `0` (scored zero) are semantically different** and must stay distinct through the whole pipeline: null is excluded from both numerator and max-possible denominator; 0 is included in both. See §4.6 of the PRD. Tests enforce this — do not collapse null into 0 for convenience.

### Score & winner logic ([lib/score.ts](lib/score.ts))

- Winner is chosen by **normalized** score (`total / maxPossible`), not raw total — otherwise options with more filled cells unfairly dominate.
- Tie detection uses **cross-multiplication** (`cur.total * head.max` vs `head.total * cur.max`) to avoid IEEE-754 equality edge cases. Preserve this pattern; do not replace with direct float comparison.
- `findWinners` returns *all* tied options — ties render as "Tied for top pick", never arbitrarily resolved.
- `isShareable()` gates the orange variant of the Share button and also gates dynamic OG metadata — it tracks the same "worth sharing" condition as winner existence.

### Scale toggle ordering ([lib/state.ts](lib/state.ts) `setScale`, [lib/scale.ts](lib/scale.ts))

When toggling 5↔10, **rescale runs before any clamp/validation pass**. Clamping first destroys data (e.g. an 8 on scale 10 would clamp to 5, then become 4 instead of 10). This ordering is guarded by a test in `state.test.ts` — if you refactor the reducer, keep rescale first.

The rescale toast ("Scores rescaled for the new range.") is only shown when at least one non-null cell existed *before* the toggle — see `handleScaleChange` in [app/MatrixPage.tsx](app/MatrixPage.tsx). Changing scale on a blank matrix is silent.

### URL encoding ([lib/encode.ts](lib/encode.ts))

- Serialize with compact single-letter keys, strip `null` cells, then compress with `lz-string` `compressToEncodedURIComponent`.
- Target: worst case (10 options × 8 factors, 40-char names, all 80 cells scored) must stay under a 2000-char URL budget. A dedicated test ("URL length sanity (worst case)") will fail if you exceed it.
- `decode` returns a tagged result `{ok:true,value} | {ok:false,reason}` — the page shows a dismissible toast and falls back to a fresh matrix on failure. Do not throw from decode paths.

### URL-on-share-only (intentional)

[app/MatrixPage.tsx](app/MatrixPage.tsx) hydrates from `?m=` once on load and then never syncs edits back to the URL. This is deliberate per §4.9 ("refresh resets unless you're on a shared URL"). The hydration effect is guarded by a `hydrated` flag so `searchParams` changes during the session can't re-hydrate. Share-button click copies the URL to clipboard but **does not call `history.replaceState`** — the address bar stays on `/`. Clipboard-API failure falls back to an inline dialog with a selectable input (see `ShareFallbackDialog` in [app/MatrixPage.tsx](app/MatrixPage.tsx)).

Do not "fix" the refresh-loses-edits behavior without explicit spec change.

### Suspense boundary

[app/page.tsx](app/page.tsx) wraps `MatrixPage` in `<Suspense>` because `useSearchParams()` otherwise bails the App Router out of static rendering and warns at build. Keep the boundary.

### OG image and metadata

- [app/api/og/route.tsx](app/api/og/route.tsx) is an **edge-runtime** endpoint (`export const runtime = "edge"`). It reads `?m=`, decodes with the same `lib/encode.ts` used client-side, and renders a 1200×630 `ImageResponse`. A missing or malformed param falls back to the brand card.
- [app/page.tsx](app/page.tsx) `generateMetadata` produces per-request `<meta>` — the OG/Twitter image URL includes the current `?m=` so link unfurls reflect the specific shared matrix (§4.10). Decode failures silently fall back to default metadata — do not throw.
- [app/layout.tsx](app/layout.tsx) sets `metadataBase` from `VERCEL_URL` when present (auto-injected on Vercel), otherwise `http://localhost:3000`.

### PNG export ([app/MatrixPage.tsx](app/MatrixPage.tsx) `handleExport`)

- Client-side via `html-to-image`'s `toPng`. Captures the `exportRef` region (the matrix card), then triggers a download named from `slugify(title)`.
- Editing UI is hidden during capture via a CSS rule: `main[data-exporting="true"] [data-export-hide]` → `visibility: hidden`, plus `.export-hide-slider` → `display: none`. The main element's `data-exporting` attribute is toggled around the capture; a `requestAnimationFrame` ensures the DOM reflects the hidden state before `toPng` runs.
- When adding new editable chrome (buttons, sliders, drag handles) inside the matrix card, tag it with `data-export-hide` (or `export-hide-slider` for sliders) so it's omitted from the PNG. The slider rule uses `display: none` rather than `visibility: hidden` so the weight number beside it shifts left and the layout reads as a static cell in the export.

### Two-step confirm pattern

- `DeleteButton` ([components/DeleteButton.tsx](components/DeleteButton.tsx)) uses a shared `armedId` state owned by `MatrixPage` so only one delete can be armed at a time. Clicking outside, blurring, Escape, or a 3 s timeout disarms.
- The Header's "Start over" uses the same pattern with its own `resetArmed` state gated by `isDirty(state)` — a clean matrix resets immediately with no confirm.
- If you add another destructive action, reuse the armed/3s-timeout shape so the UX stays consistent.

### Design tokens

Tailwind palette in [tailwind.config.ts](tailwind.config.ts) is deliberately minimal: warm neutrals (`bg`, `ink`, `mute`), a dark pill (`pill`), and **a single orange** (`orange` + `orange.wash`). Orange is reserved for the winner row, the Share button in its shareable state, and the armed state of destructive confirms — do not introduce additional accent colors or apply orange to other UI elements. No web fonts: the font stack is system Helvetica Neue/Helvetica/Arial.

## Open items (not shipped)

- Narrow viewports (< 640 px): horizontal scroll works but the option-name column is not yet `position: sticky` (§5.5).
- Keyboard operability: focus-on-add is wired via `FocusRequest` but end-to-end keyboard-only flow hasn't been audited.
- Lighthouse accessibility ≥ 95 has not been measured on a production build.
