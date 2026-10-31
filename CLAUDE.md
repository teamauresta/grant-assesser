# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Overview

Grant Navigator helps Australian AI startups find grants, tax incentives, credits and accelerators, check eligibility, and plan applications. It is a Next.js 16 static export (React 19, TypeScript, Tailwind CSS 4, Zod 4, Zustand 5) deployed to GitHub Pages under the base path `/grant-assesser`. All user data stays in the browser. The look is Billabong (in the posthog.com style, with our own art): a grey-beige page, chunky amber buttons, window-framed panels, marker highlights, Rubik, and a platypus mascot.

- Design: `docs/plans/2026-10-27-grant-navigator-design.md` (screens, data rules, Appendix A fact-check register); the visual system is `docs/plans/2026-10-31-billabong-design.md` (palette, type, signature pieces, art, copy; section 11 records what was built and why)
- Implementation plans: `docs/plans/2026-10-27-grant-navigator.md` (read its "Conventions" section) and `docs/plans/2026-10-31-billabong.md`
- Art: `docs/art/billabong-prompts.md` (the image prompts, file names and sizes) and `art/README.md` (adding art)
- `legacy/` holds the old single-file app (`index.html`, `base.jsx`, `404.html`). It is reference only: not built, linted, type-checked or deployed. Do not edit it.

## Structure

- `app/` routes: `/`, `programs/`, `programs/[slug]/`, `assess/`, `assess/results/`, `plan/`, `report/`, `settings/`, plus `not-found.tsx` (exported as `out/404.html`). `app/globals.css` holds the design tokens and utilities; `app/layout.tsx` holds Rubik and the pre-paint theme script.
- `components/` by feature: `ui`, `motion` (`MotionProvider`, `Reveal`, `CountUp`), `layout`, `home`, `programs`, `assess`, `results`, `plan`, `calendar`, `report`, `settings`.
  - `ui` primitives: `button.tsx` (`Button`, `buttonClasses()`, `FILE_BUTTON_CLASSES`), `window.tsx` (`Window`, `WINDOW_FRAME`, `WINDOW_BAR`, `WindowControls`), `highlight.tsx` (`Highlight`), `art.tsx` (`Art`), `card.tsx`, `choice-group.tsx`, `dialog.tsx`, `menu.tsx`, `tabs.tsx`, `badge.tsx`, `status-pill.tsx`, `field.tsx`, `toast.tsx`, `list.ts` (`LIST_FRAME`), `callout.ts` (`WARN_CALLOUT`), `spotlight.ts` (`useSpotlight()`), `focus-ring.ts` (`focusRing`, `focusRingInset`)
  - `layout`: `logo-mark.tsx` (`LogoMark`, the platypus emblem picture, passed in by the layout as `logo`), the top bar, mobile header and bottom nav (`inset-bar.ts`: `BAR_BAND`, `INSET_BAR`, and the list of `--bar-h` users), `page-notice.tsx` (`PageNoticeWindow`, the 404 and error page), storage banner, backup prompt
  - `home`: `hero.tsx` (headline with one highlight, the diorama `Art`), `hero-stats.tsx`, `persona-cards.tsx`, `sort-story.tsx` (the sorting story, `PIN_QUERY`), `how-it-works.tsx` (three step windows), `previews.tsx` (their `AnswerPreview`, `AssessPreview`, `PlanPreview`), `category-band.tsx` (Browse by type) and `resume-card.tsx` (Pick up where you left off, for returning visitors)
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
  - `art.ts` the art manifest (each asset's file, size, alt text, dark partner, own widths for the logo emblem; `artSrcSet()`; import-free so the script runs it); `art-ready.json` which processed images exist (written by `pnpm art`); `hero-preload.ts` `HERO_SIZES` and the theme script's preload of the active hero picture
  - `highlight.ts` `HIGHLIGHT_ALPHA` and `splitHighlight()` (cuts a title around its highlighted phrase)
  - `celebrate.ts` `cheer()`, confetti bursts and every celebration message (`stageCheer()`, `resultsCheer()`, `goalsDoneCheer()`); `toast.ts` the toast store; `motion.ts` reduced-motion check and `tween()`; `contrast.ts` WCAG contrast maths
  - `showcase.ts` the sorting story's layout and motion maths (wide-screen `pileLayout`, phone pile slots, per-chip progress, scroll progress), in the first load; `showcase-story.ts` `DEMO_PROFILE` and `sortStory()`, which run the real checks and load with `import()`
  - `format.ts` money and label formatting (`moneyCounter()` for count-ups); `personas.ts` persona copy, results headings and their highlight phrases, defaults; `copy.ts` shared strings; `download.ts` browser file save; `theme.ts` theme preference; `use-now.ts` shared client clock; `use-height-var.ts` (`useHeightVar()`, an element's height into a CSS variable); `cn.ts`, `id.ts`
- `art/originals/` the art originals (PNG, gitignored except `.gitkeep`; never deployed); `public/art/` the processed AVIF and WebP (committed)
- `scripts/serve-out.mjs` static server for `out/`; `scripts/check-freshness.ts` weekly data report; `scripts/js-size.mjs` home first-load JS budget, plus a check that the `LAZY_ONLY` markers (confetti, the PDF renderer, the sorting story's checks) stay out of the first-load chunks and are found in some chunk; `scripts/process-art.mjs` (`pnpm art`) the art pipeline
- `tests/` `lib/`, `components/`, `content/` (Vitest); `e2e/` (Playwright + axe); `fixtures/personas.ts`; `helpers/`
- `.github/workflows/` `ci.yml`, `deploy.yml` (Pages, on push to `main`), `freshness.yml` (weekly issue)

## Commands

```bash
pnpm dev          # http://localhost:3000/grant-assesser/
pnpm test         # Vitest: unit, component, content, persona snapshots
pnpm e2e          # Playwright journey + axe at 375px and 1280px (builds and serves out/ on :4173)
pnpm typecheck
pnpm lint
pnpm build        # static export to out/ (needs network: next/font downloads Rubik at build time)
pnpm serve        # serve out/ at http://localhost:4173/grant-assesser/
pnpm freshness    # Markdown report of stale data, upcoming closes, broken links
pnpm size         # home first-load JS (gzipped) against its budget; run after pnpm build
pnpm art          # art/originals/*.png to public/art/ AVIF + WebP, then lib/art-ready.json and the app icons
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
- `cn()` joins classes without merging Tailwind conflicts, so a primitive takes a prop (`variant`, `size`, `emphasis`, `padding`, `borderClassName`) rather than a caller's competing class.

## Static export constraints

- `output: 'export'` with `basePath: '/grant-assesser'` and `trailingSlash: true` (`next.config.ts`). No server code: no API routes, server actions, middleware, cookies or request-time rendering.
- Storage is client only, behind the `WorkspaceStore` interface in `lib/store/workspace-store.ts` (`LocalWorkspaceStore` in the app, `MemoryWorkspaceStore` in tests). A future backend should be a new implementation of that interface, not changes to components.
- Browser-only modules (PDF renderer, `window`, `localStorage`) must load on the client, behind `'use client'` and effects or dynamic `import()`.

## Testing

- TDD for `lib/`: write the failing test first.
- `tests/content/personas.test.ts` snapshots the group of every program for three fixture companies. A data edit that moves a program changes the snapshot: review each change, add an explicit assertion with a comment explaining why, then update.
- `tests/lib/tokens.test.ts` checks every token pair for WCAG (text AA, controls and ledges 3:1, `--fg` on each highlight, the spotlight, the banners), the `highlight` utility's rules, the radius token (no hard-coded `[7px]`), no monospace in `app/`, `components/` or `lib/`, and that no removed token or utility (`--panel-*`, `glow-brand`, the contour hero, `--logo`/`--on-logo`) returns. `tests/components/button.test.tsx` scans call sites for non-layout `className`s; `highlight.test.tsx` scans for raw `<mark>`, the bare utility and muted text in a `Highlight`; `tests/lib/process-art.test.ts` keeps the art manifest, the prompts doc, `lib/art-ready.json` and `public/art/` in step (no leftovers, the hero AVIF budget, the PNG icons and no `app/icon.svg`).
- `tests/e2e/journey.spec.ts` covers the main journey (under reduced motion); `tests/e2e/a11y.spec.ts` runs axe (WCAG 2 A/AA) on every page with an empty workspace, and on populated pages in light and dark. `billabong.spec.ts` covers the button ledges and press (and no movement under reduced motion), the top bar and the phone bottom bars (nothing hides focus, 200% text), the marker highlight in the built CSS and in forced colours, the wizard's choice cards, and the plan (no clipping, toasts only once a dialog has closed). `liftoff.spec.ts` covers the hero numbers, type links and celebrations; `showcase.spec.ts` covers the hero headline and layout, the hero picture (one fetch per theme, preloaded from md), the sorting story (desktop scroll, phone settle, reduced motion, keyboard focus), the How it works previews, the persona cards' platypus, and the absence of coloured strips (except a ledge's width) and of gradient text (`background-clip: text`); `motion.spec.ts` checks content stays visible when motion's features fail to load. `screens.spec.ts` (with `SCREENS=1`) saves review screenshots of most pages and every art slot (`art-*`), light and dark; it compares nothing.
- Never weaken, skip or delete an assertion to make a test pass. Fix the code or the data.

## Design system (Billabong)

- **Tokens.** Use the token classes from `app/globals.css` (`bg-bg`, `bg-surface`, `bg-neutral-bg`, `text-fg`, `text-muted-fg`, `border-border`, `border-border-strong`, `bg-primary text-on-primary`, `text-accent`, ...). No raw hex in components. `--bg` is the grey-beige page, `--surface` cards and window bodies, `--neutral-bg` title bars and the top bar; `--border` is decorative, `--border-strong` (3:1) outlines controls and pills. `--primary` amber with `--on-primary` dark text; `--accent` eucalyptus for links, focus and checked states. Status colours (`--ok-*`, `--warn-*`) are for `StatusPill` and warnings only (`WARN_CALLOUT`, the program page's caveats); the accent never shows status. `--brand`, `--brand-2`, `--spark` are for brand moments only (the progress ring, persona tones), never status or body text. The logo is the owner's platypus emblem, a picture (`LogoMark`, the `logo-emblem` art asset, 32px, decorative beside the live "Grant Navigator" text); it has no tokens (`--logo` and `--on-logo` were removed with the SVG compass mark).
- Every text and background pair meets WCAG AA in both themes; add any new pair to `tests/lib/tokens.test.ts`.
- **Type.** Rubik, the variable font, through `next/font/google` (self-hosted at build; builds need network; the site makes no request to Google). The PDF keeps its embedded Geist. Dates, amounts, scores and counts use `num` (tabular digits); never monospace (`font-mono` does not exist, and a test forbids monospace).
- **Buttons** (`components/ui/button.tsx`): primary amber, secondary `--surface` in a `--border-strong` outline, ghost, danger; sizes `sm` 36px, `md` 44px, `lg` 48px (the hero). Primary, secondary and danger have a 3px ledge (a darker bottom border of the button's own colour: `--primary-ledge`, `--border-strong`, `--danger-ledge`); the `ledge` utility presses it 2px down, never under reduced motion. A button's or button-styled link's `className` is layout only (margin, flex, self, width, shrink); size and colour come from `variant` and `size` (a test scans `app/` and `components/`). A file input uses `FILE_BUTTON_CLASSES`.
- **Windows** (`Window`): a panel with a `--neutral-bg` title bar (its title a heading, `as` h1 to h4, `titleSize` `sm` or `md`) and `aria-hidden` decorative controls, on `--surface`, with `shadow-window`. A region named by its title unless `landmark={false}`; `actions`, `padding`, `borderClassName`, `titleId`, `headingRef`/`headingProps` for focus. Used by role: results summary, program sections, report options and preview, pipeline columns, How it works steps, settings sections, the wizard, the 404 and error page. Dialogs draw as windows (`WINDOW_FRAME`, `WINDOW_BAR`) with a real Close button; skeletons use `WINDOW_FRAME`.
- **Highlights** (`Highlight`, a `<span>` with the `highlight` utility; tone `amber`, `sage` or `sky`): a marker band behind `--fg` text only, never muted text, at most once per heading (the hero, page intros, the results heading via `splitHighlight()`). No raw `<mark>` and no bare utility. The band is painted only inside `@supports (color: color-mix(...))`, so no browser draws it at full strength; forced colours use `Mark`/`MarkText`.
- **Cards** (`Card`): `--surface`, a 1px `--border` outline, 8px radius; `emphasis="quiet"` (no fill, dashed `--border-strong`) for items that stay listed but are set aside (Not a fit). `ChoiceGroup` cards have an accent border, inset ring and check icon when checked; `emphasis="quiet"` drops the ring (the report builder). Framed lists use `LIST_FRAME`; the radius inside a `rounded-lg` frame's border is `--radius-inner` (`rounded-t-inner`, `rounded-b-inner`), never `[7px]`. Menus and toasts are `--surface` popovers with `shadow-popover`. Shadows are only the window's, the popover's and a hover lift on interactive cards. Pills and badges are fully rounded with a 1px outline. Tabs and the active nav item have a 3px `--accent` underline.
- **Bars.** The top bar (sticky), mobile header and bottom nav are inset rounded bars on `--neutral-bg` in a full-width `--bg` band. Their heights are `--bar-h` and `--bottom-bar-h`, and the wizard's phone footer is `--wizard-footer-h` (measured with `useHeightVar`); anything that clears them (`html` scroll padding, the sorting story's pin, `main`'s padding, toasts) uses these variables. `html` `scroll-padding-top` clears the sticky bar at every width; below `md`, `scroll-padding-bottom` clears the bottom nav (and the wizard's footer), so focus is never hidden.
- **Art** (`Art name sizes alt? priority? eager?`, manifest in `lib/art.ts`): the platypus, props and dioramas are illustrations, not icons. `pnpm art` turns `art/originals/<file>.png` into AVIF and WebP at 480, 960 and 1440 pixels (the logo emblem at 32, 64 and 128) in `public/art/`, writes `lib/art-ready.json` and, from the logo emblem, `app/icon.png` and `app/apple-icon.png`; until an image exists `Art` shows a neutral placeholder of the same box, so builds never wait on art. All art is in (31 Oct 2026); commit `public/art/`, `lib/art-ready.json` and the icons, never `art/originals/`. Give `Art` a width in `className` or a sized parent. Decorative art is `alt=""` (or `null` alt in the manifest); the hero is a day/dusk pair switched by the theme in CSS, both lazy, and on the home page the pre-paint theme script preloads the active one from 48rem (`lib/hero-preload.ts`; keep the hero's `sizes` as `HERO_SIZES`). `LogoMark` is rendered by the layout (a server component) and passed to the bars as `logo`, so the client bars never import `Art`. A new asset needs a manifest entry and a prompt (or source) in `docs/art/billabong-prompts.md`.
- No decorative coloured strips, edges or bars: borders are neutral. The only coloured lines are state indicators (active nav item, active tab, progress bars, a checked choice) and a button's ledge, which is part of its shape and appears only on buttons. Highlights are backgrounds behind text, not strips. No gradient text. The PDF report uses neutral hairlines.
- No emoji. Icons from `lucide-react` only, at 16 or 20px with `strokeWidth={1.5}`.
- Cursor spotlight on cards and links: `useSpotlight()` (`components/ui/spotlight.ts`) on the list, `data-spotlight` and the `spotlight` utility on each item. The highlight is plain `--fg` at the layer's opacity `--spot-mix` (6% light, 4% dark; `tests/lib/tokens.test.ts` keeps text AA on it), never a `color-mix()`; `--spot-size` sets its radius (240px default, 200px persona cards, 72px type links). Mouse and pen only, off under reduced motion.
- **Copy** (design doc section 7): playful only in headlines, empty states, the 404, celebrations and toasts (one joke at most, never at the visitor's expense or about money, eligibility or deadlines; at most one `!` per celebration; no dash asides). Plain and exact for eligibility, amounts, deadlines, caveats, the PDF and data settings. Australian English. Celebration messages live in `lib/celebrate.ts`, where a voice test covers them.
- Reuse the primitives in `components/ui/` before writing new ones.

## Motion and celebrations

- Use `components/motion/` (`Reveal`, `CountUp`, `MotionProvider`). Durations 150–300ms, ease-out to enter. Exceptions, each once per load or view: the hero headline's `rise` (600ms, staggered 80ms) and the How it works previews (each part 300–650ms, all done within 1.5s).
- Import `m` from `motion/react-m`, never `motion/react` (that adds about 35KB to the first load); `LazyMotion` is `strict`, which forbids `motion.*`. Features (`domMax`) load after hydration.
- An `m.*` element may start hidden only when `useMotionReady()` (`components/motion/motion-provider.tsx`) is true; otherwise use `initial={false}`, or it stays invisible if the features never load.
- Automatic motion must stop within 5 seconds (WCAG 2.2.2): finite CSS iteration counts. The one exception is the report's PDF spinner, a progress indicator the visitor started that runs only while the PDF is made (and not at all under reduced motion).
- The sorting story is driven by scroll on screens at least 48rem wide and 40rem tall (a pinned section below the sticky bar, the `pin` variant; a tighter `pin-short` layout below 54rem tall keeps the whole block on screen; `PIN_QUERY` matches; progress read from the layout, written to CSS variables, no React render per frame) and settles once per visit, over 1.2s, elsewhere (phones, short windows). A focused chip shows the stage sorted. Its sorted layout is the real DOM.
- Every effect is off under reduced motion: the global CSS rule zeroes CSS animations, `MotionConfig` sets `skipAnimations`, and JavaScript effects call `prefersReducedMotion()` from `lib/motion.ts`. The sorting story shows the sorted result; previews show their end state (the rule also zeroes `animation-delay`); count-ups show the final value; buttons do not move when pressed.
- Count-ups use `CountUp`; for money pass `moneyCounter()` from `lib/format.ts` as `format`.
- Celebrations go through `cheer()` in `lib/celebrate.ts`: a toast once per event, plus confetti (amber, sage and sky, `CONFETTI_COLOURS`) only when Celebrations is on in Settings and motion is allowed. Confetti draws on its own `aria-hidden` canvas. Never celebrate declined, withdrawn or not-a-fit. While a dialog is open the page (toaster included) is inert, so cheer after it closes.
- Bundle: keep heavy code (`canvas-confetti`, the PDF renderer, the sorting story's checks) behind `import()`. `pnpm size` must pass (home first-load 279,365 bytes gzipped on 31 Oct 2026, after the art landed, against a 297,083-byte budget; it also prints other pages for information).
