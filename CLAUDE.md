# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Overview

Grant Navigator helps Australian AI startups find grants, tax incentives, credits and accelerators, check eligibility, and plan applications. It is a Next.js 16 static export (React 19, TypeScript, Tailwind CSS 4, Zod 4, Zustand 5) deployed to GitHub Pages under the base path `/grant-assesser`. All user data stays in the browser.

- Design: `docs/plans/2026-10-27-grant-navigator-design.md` (screens, visual system, data rules, Appendix A fact-check register)
- Implementation plan: `docs/plans/2026-10-27-grant-navigator.md` (read its "Conventions" section)
- `legacy/` holds the old single-file app (`index.html`, `base.jsx`, `404.html`). It is reference only: not built, linted, type-checked or deployed. Do not edit it.

## Structure

- `app/` routes: `/`, `programs/`, `programs/[slug]/`, `assess/`, `assess/results/`, `plan/`, `report/`, `settings/`, plus `not-found.tsx` (exported as `out/404.html`). `app/globals.css` holds the design tokens; `app/layout.tsx` holds the pre-paint theme script.
- `components/` by feature: `ui` (primitives, plus `spotlight.ts` `useSpotlight()`), `motion` (`MotionProvider`, `Reveal`, `CountUp`), `layout`, `home`, `programs`, `assess`, `results`, `plan`, `calendar`, `report`, `settings`. `home` holds the hero (`hero-aurora.tsx` pause button and fallbacks, `aurora-canvas.tsx` the WebGL canvas, loaded with `import()`), `sort-story.tsx` (the sorting story) and `previews.tsx` (How it works previews).
- `content/programs/<slug>.ts` one record per program; `content/programs/index.ts` registers and parses them all with `ProgramSchema`. `content/verification/` holds the fact-check evidence (a copy of the design doc's Appendix A).
- `lib/`
  - `schema.ts` Zod schemas for programs, profile and workspace; gate ids and per-gate params
  - `dates.ts` date helpers (Melbourne time, ISO dates, business days)
  - `gates/` eligibility checks; `status.ts` runtime status from deadlines and `now`; `scoring.ts` program scores
  - `assess.ts` result groups, ranking and funding estimate; `groups.ts` group ids, order and labels only (re-exported by `assess.ts` and `assessment/results.ts`, so a page can show them without the checks); `assessment/` wizard questions and group copy
  - `plan/` applications, goals, selectors, plan tabs, `progress.ts` (progress ring, resume card); `calendar/` events, `.ics`, Google and Outlook links
  - `store/` the `WorkspaceStore` interface, localStorage and memory implementations, Zustand hook, backup and import/export
  - `pdf/` report data and the `@react-pdf/renderer` document (loaded with dynamic `import()` only)
  - `programs/` directory filters, Not-a-fit reasons, status hooks, `stats.ts` (hero numbers, latest verification date)
  - `celebrate.ts` `cheer()` and confetti bursts; `toast.ts` milestone messages; `motion.ts` reduced-motion check and `tween()`; `contrast.ts` WCAG contrast maths
  - `aurora.ts` the hero aurora's strength (`AURORA_ALPHA`) and remembered pause (`gn-aurora`), in the first load; `aurora-shader.ts` its shaders, colour reading and clock, imported only by the lazy canvas
  - `showcase.ts` the sorting story's layout and motion maths (wide-screen `pileLayout`, phone pile slots, per-chip progress, scroll progress), in the first load; `showcase-story.ts` `DEMO_PROFILE` and `sortStory()`, which run the real checks and load with `import()`
  - `format.ts` money and label formatting (`moneyCounter()` for count-ups); `personas.ts` persona copy and defaults; `copy.ts` shared strings; `download.ts` browser file save; `theme.ts` theme preference; `use-now.ts` shared client clock; `cn.ts`, `id.ts`
- `scripts/serve-out.mjs` static server for `out/`; `scripts/check-freshness.ts` weekly data report; `scripts/js-size.mjs` home first-load JS budget, and a check that the aurora shader (`LAZY_ONLY`) stays out of the first-load chunks
- `tests/` `lib/`, `components/`, `content/` (Vitest); `e2e/` (Playwright + axe); `fixtures/personas.ts`; `helpers/`
- `.github/workflows/` `ci.yml`, `deploy.yml` (Pages, on push to `main`), `freshness.yml` (weekly issue)

## Commands

```bash
pnpm dev          # http://localhost:3000/grant-assesser/
pnpm test         # Vitest: unit, component, content, persona snapshots
pnpm e2e          # Playwright journey + axe at 375px and 1280px (builds and serves out/ on :4173)
pnpm typecheck
pnpm lint
pnpm build        # static export to out/
pnpm serve        # serve out/ at http://localhost:4173/grant-assesser/
pnpm freshness    # Markdown report of stale data, upcoming closes, broken links
pnpm size         # home first-load JS (gzipped) against its budget; run after pnpm build
SCREENS=1 pnpm e2e tests/e2e/screens.spec.ts   # review screenshots in test-results/screens/
```

After every change, `pnpm typecheck && pnpm lint && pnpm test` must pass; run `pnpm e2e` for UI changes.

## Program data rules

- Every record is validated by `ProgramSchema` at import. Gate params are strict objects: an unknown or misspelt key fails validation.
- A program may be `open` or `rolling` only if it cites a source with `official: true` (enforced in `tests/content/programs.test.ts`). Otherwise use `unverified`. Appendix A of the design doc is the evidence base.
- When you change a record: check it against official pages, bump `verification.lastVerified`, add a `changelog` entry, and record anything the tool cannot check in `content.caveats`.
- Status is derived at runtime from the declared state, deadlines and `now` (`lib/status.ts`). Never bake "now" into rendered HTML: server and first client render show the declared state, then the client refines it.
- Gates have three outcomes (`pass`, `fail`, `unknown`), a severity (`hard` or `soft`) and a `fixable` flag. A hard, unfixable fail means Not a fit; unanswered questions give `unknown`, never `fail`.
- Programs that are alternatives share an `exclusiveGroup`; only the best one counts toward the funding estimate.

## Code conventions

- Logic functions take `now: Date` as a parameter. UI gets it from `useNow()` (`lib/use-now.ts`), which is `null` on the server and during the first client render.
- Calendar dates are `YYYY-MM-DD` strings; use `lib/dates.ts` and never `new Date('YYYY-MM-DD')`.
- `@/` is the repo root alias.

## Static export constraints

- `output: 'export'` with `basePath: '/grant-assesser'` and `trailingSlash: true` (`next.config.ts`). No server code: no API routes, server actions, middleware, cookies or request-time rendering.
- Storage is client only, behind the `WorkspaceStore` interface in `lib/store/workspace-store.ts` (`LocalWorkspaceStore` in the app, `MemoryWorkspaceStore` in tests). A future backend should be a new implementation of that interface, not changes to components.
- Browser-only modules (PDF renderer, `window`, `localStorage`) must load on the client, behind `'use client'` and effects or dynamic `import()`.

## Testing

- TDD for `lib/`: write the failing test first.
- `tests/content/personas.test.ts` snapshots the group of every program for three fixture companies. A data edit that moves a program changes the snapshot: review each change, add an explicit assertion with a comment explaining why, then update.
- `tests/e2e/journey.spec.ts` covers the main journey (under reduced motion); `tests/e2e/a11y.spec.ts` runs axe (WCAG 2 A/AA) on every page with an empty workspace, and on populated pages in light and dark. `liftoff.spec.ts` covers the hero numbers, type links and celebrations; `showcase.spec.ts` covers the aurora pause (and its still frame under reduced motion), the sorting story (desktop scroll, phone settle, reduced motion, keyboard focus), the How it works previews and the absence of coloured strips; `motion.spec.ts` checks content stays visible when motion's features fail to load.
- Never weaken, skip or delete an assertion to make a test pass. Fix the code or the data.

## Design system

- Use the token classes from `app/globals.css` (`bg-bg`, `bg-surface`, `text-fg`, `text-muted-fg`, `border-border`, `border-border-strong`, ...). No raw hex in components. Status colours are for `StatusPill` only.
- Every text and background pair meets WCAG AA in both themes; keep it that way when adding tokens.
- Minimal style: Geist fonts, quiet surfaces, one accent, plus the Liftoff gradient (`--lift-1..3`, `text-lift`, `glow-lift`, `LogoMark`, the hero aurora) for brand moments only, never for status or body text. The logo uses `--logo-*` (the light stops in both themes) because white fails 3:1 on the dark `--lift-*` stops. The "How it works" panel is dark in both themes and has its own `--panel-*` tokens; `--panel-border` is a dark-theme-only decorative edge; `--panel-surface` is the card colour on the panel (the previews). No emoji. Icons from `lucide-react` only, at 16 or 20px with `strokeWidth={1.5}`.
- No decorative coloured strips, edges or bars: borders are neutral. The only coloured lines are state indicators (active nav item, active tab, progress bars). The PDF report uses neutral hairlines.
- Cursor spotlight on cards and links: `useSpotlight()` (`components/ui/spotlight.ts`) on the list, `data-spotlight` and the `spotlight` utility on each item. The highlight is plain `--fg` at the layer's opacity `--spot-mix` (6% light, 4% dark; `tests/lib/tokens.test.ts` keeps text AA on it), never a `color-mix()`; `--spot-size` sets its radius (240px default, 200px persona cards, 72px type links). Mouse and pen only, off under reduced motion.
- Reuse the primitives in `components/ui/` before writing new ones.

## Motion and celebrations

- Use `components/motion/` (`Reveal`, `CountUp`, `MotionProvider`). Durations 150–300ms, ease-out to enter. Exceptions, each once per load or view: the hero headline's `rise` (600ms, staggered 80ms) and the How it works previews (each part 300–650ms, all done within 1.5s).
- Import `m` from `motion/react-m`, never `motion/react` (that adds about 35KB to the first load); `LazyMotion` is `strict`, which forbids `motion.*`. Features (`domMax`) load after hydration.
- An `m.*` element may start hidden only when `useMotionReady()` (`components/motion/motion-provider.tsx`) is true; otherwise use `initial={false}`, or it stays invisible if the features never load.
- Automatic motion must stop within 5 seconds (WCAG 2.2.2): finite CSS iteration counts. The hero aurora is the only automatic motion that runs longer; it has a pause button (one name, "Pause background animation", with `aria-pressed`; remembered in `gn-aurora`) and stops off screen and in hidden tabs.
- The sorting story is driven by scroll on screens at least 48rem wide and 36rem tall (a pinned section, the `pin` variant; a tighter `pin-short` layout below 50rem tall keeps the whole block on screen; progress read from the layout, written to CSS variables, no React render per frame) and settles once per visit, over 1.2s, elsewhere (phones, short windows). A focused chip shows the stage sorted. Its sorted layout is the real DOM.
- Every effect is off under reduced motion: the global CSS rule zeroes CSS animations, `MotionConfig` sets `skipAnimations`, and JavaScript effects call `prefersReducedMotion()` from `lib/motion.ts`. The hero aurora draws one still frame with no pause button (a still gradient without WebGL); the sorting story shows the sorted result; previews show their end state (the rule also zeroes `animation-delay`); count-ups show the final value.
- Count-ups use `CountUp`; for money pass `moneyCounter()` from `lib/format.ts` as `format`.
- Celebrations go through `cheer()` in `lib/celebrate.ts`: a toast once per event, plus confetti only when Celebrations is on in Settings and motion is allowed. Confetti draws on its own `aria-hidden` canvas. Never celebrate declined, withdrawn or not-a-fit.
- Bundle: keep heavy code (`canvas-confetti`, the PDF renderer, the aurora canvas and shader, the sorting story's checks) behind `import()`. `pnpm size` must pass (home first-load 279,695 bytes gzipped on 29 Oct 2026 against a 297,083-byte budget; it also prints other pages for information).
