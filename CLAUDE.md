# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Overview

Grant Navigator helps Australian AI startups find grants, tax incentives, credits and accelerators, check eligibility, and plan applications. It is a Next.js 16 static export (React 19, TypeScript, Tailwind CSS 4, Zod 4, Zustand 5) deployed to GitHub Pages under the base path `/grant-assesser`. All user data stays in the browser.

- Design: `docs/plans/2026-10-27-grant-navigator-design.md` (screens, visual system, data rules, Appendix A fact-check register)
- Implementation plan: `docs/plans/2026-10-27-grant-navigator.md` (read its "Conventions" section)
- `legacy/` holds the old single-file app (`index.html`, `base.jsx`, `404.html`). It is reference only: not built, linted, type-checked or deployed. Do not edit it.

## Structure

- `app/` routes: `/`, `programs/`, `programs/[slug]/`, `assess/`, `assess/results/`, `plan/`, `report/`, `settings/`, plus `not-found.tsx` (exported as `out/404.html`). `app/globals.css` holds the design tokens; `app/layout.tsx` holds the pre-paint theme script.
- `components/` by feature: `ui` (primitives), `layout`, `home`, `programs`, `assess`, `results`, `plan`, `calendar`, `report`, `settings`.
- `content/programs/<slug>.ts` one record per program; `content/programs/index.ts` registers and parses them all with `ProgramSchema`. `content/verification/` holds the fact-check evidence (a copy of the design doc's Appendix A).
- `lib/`
  - `schema.ts` Zod schemas for programs, profile and workspace; gate ids and per-gate params
  - `dates.ts` date helpers (Melbourne time, ISO dates, business days)
  - `gates/` eligibility checks; `status.ts` runtime status from deadlines and `now`; `scoring.ts` program scores
  - `assess.ts` result groups, ranking and funding estimate; `assessment/` wizard questions and group copy
  - `plan/` applications, goals, selectors, plan tabs; `calendar/` events, `.ics`, Google and Outlook links
  - `store/` the `WorkspaceStore` interface, localStorage and memory implementations, Zustand hook, backup and import/export
  - `pdf/` report data and the `@react-pdf/renderer` document (loaded with dynamic `import()` only)
  - `programs/` directory filters, Not-a-fit reasons, status hooks
  - `format.ts` money and label formatting; `personas.ts` persona copy and defaults; `copy.ts` shared strings; `download.ts` browser file save; `theme.ts` theme preference; `use-now.ts` shared client clock; `cn.ts`, `id.ts`
- `scripts/serve-out.mjs` static server for `out/`; `scripts/check-freshness.ts` weekly data report
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
- `tests/e2e/journey.spec.ts` covers the main journey; `tests/e2e/a11y.spec.ts` runs axe (WCAG 2 A/AA) on every page with an empty workspace, and on populated pages in light and dark.
- Never weaken, skip or delete an assertion to make a test pass. Fix the code or the data.

## Design system

- Use the token classes from `app/globals.css` (`bg-bg`, `bg-surface`, `text-fg`, `text-muted-fg`, `border-border`, `border-border-strong`, ...). No raw hex in components. Status colours are for `StatusPill` only.
- Every text and background pair meets WCAG AA in both themes; keep it that way when adding tokens.
- Minimal style: Geist fonts, quiet surfaces, one accent. No emoji. Icons from `lucide-react` only, at 16 or 20px with `strokeWidth={1.5}`.
- Reuse the primitives in `components/ui/` before writing new ones.
