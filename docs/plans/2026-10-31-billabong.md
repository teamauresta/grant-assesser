# Billabong Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restyle Grant Navigator in the posthog.com style (grey-beige page, chunky amber buttons, window frames, marker highlights, a platypus mascot and clay-style art) while keeping its accessibility, motion rules, static export and first-load budget.

**Architecture:** Our own tokens and components, no new UI library: `app/globals.css` gets the Billabong palette, Rubik comes through `next/font`, and `components/ui/` gains `Window`, `Highlight` and `Art` next to restyled `Button`, `Tabs`, `Badge` and `StatusPill`. Artwork made by the owner is processed by a script into `public/art/`; placeholders hold its place until then.

**Tech Stack:** Next.js 16 static export, React 19, Tailwind CSS 4, `next/font/google` (Rubik), `sharp` (art script only), Vitest, Playwright + axe.

**Design:** `docs/plans/2026-10-31-billabong-design.md` (read all of it). Art prompts: `docs/art/billabong-prompts.md`.

**Branch:** `billabong` (from `main` at `d9eeef8`). Never push or merge without the owner's go-ahead. Never commit the untracked `AGENTS.md` or `australian-ai-startup-funding-report.md`; stage files by explicit path only. Every commit message ends with:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

## Conventions for every task

**The gate.** A task is done only when all of these pass:

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm e2e
pnpm build && pnpm size
SCREENS=1 pnpm e2e tests/e2e/screens.spec.ts   # then open the screens you touched in test-results/screens/, light and dark, 375px and 1280px
```

Where `screens.spec.ts` doesn't capture a page the task changed, capture it with a throwaway Playwright script and look at it.

**Never weaken, skip or delete an assertion to make a test pass** (`CLAUDE.md`). Allowed test changes, each with a comment citing the design doc section:
- the requirement changed by the owner's decision (design doc sections 1–8: new palette values, the button-ledge exception, the contour hero removed);
- a feature was removed, and its tests go with it (the contour canvas).

**Tokens.** Use token classes only (`bg-bg`, `bg-surface`, `text-fg`, `text-muted-fg`, `border-border`, `border-border-strong`, `bg-primary text-on-primary`, `text-accent`, `bg-neutral-bg`, …). No raw hex in components. Status colours only in `StatusPill`. Highlights only behind `--fg` text.

**Numbers.** `num` (tabular digits) for dates, amounts, scores and counts; never `font-mono`.

**Icons.** `lucide-react` only, 16 or 20px, `strokeWidth={1.5}`. The platypus and props are illustrations via `Art`, not icons.

**Motion.** Durations 150–300ms; nothing moves under reduced motion; automatic motion stops within 5 seconds.

**Bundle.** `pnpm size` must pass. If it reports OVER, stop and report the numbers; never raise the budget.

**Copy.** Playful only in headlines, empty states, the 404, celebrations and toasts; plain and exact for eligibility, amounts, deadlines, caveats and data settings (design doc section 7).

---

### Task 0: Baseline

```bash
git switch billabong && git status --short
pnpm install
pnpm typecheck && pnpm lint && pnpm test
pnpm build && pnpm size
```

Expected: all pass; record the test counts and the home first-load number (about 279,493). No commit.

---

### Task 1: Palette, Rubik and plain numbers

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`, `package.json`/`pnpm-lock.yaml` (remove `geist` only if nothing else uses it: the PDF uses its own TTFs in `public/fonts/`, so check `lib/pdf/` first)
- Modify: `tests/lib/tokens.test.ts`, `lib/celebrate.ts` (`BRAND_COLOURS` if brand hexes change; they don't in the design)
- Modify: every file under `app/` and `components/` that uses `font-mono` (about 19, all in `components/`)

**Step 1: Tests first.** In `tests/lib/tokens.test.ts`:
- Add the new pairs to the per-theme block: `--on-primary` on `--primary` (already there; the values change), `--border-strong` 3:1 on `--bg` and `--surface` (already there), and new ones:

```ts
  // Chunky buttons (design doc section 4): the ledge is a darker amber under the amber fill. It is part
  // of the control's shape, so it must be visible against the page (WCAG 1.4.11, 3:1).
  it('the primary ledge stays visible on --bg (3:1)', () => {
    expect(contrast(t['--primary-ledge'], t['--bg'])).toBeGreaterThanOrEqual(3);
  });
  // Marker highlights (design doc section 2) sit behind --fg text only, at HIGHLIGHT_ALPHA over --bg.
  it.each(['--hl-amber', '--hl-sage', '--hl-sky'])('--fg meets AA on %s', (name) => {
    expect(contrast(t['--fg'], mixHex(t['--bg'], t[name], HIGHLIGHT_ALPHA))).toBeGreaterThanOrEqual(4.5);
  });
```

  with `const HIGHLIGHT_ALPHA = 0.35;` exported from a new `lib/highlight.ts` (`export const HIGHLIGHT_ALPHA = 0.35;`) so CSS and tests share the number (the CSS uses `color-mix(in srgb, var(--hl-amber) 35%, transparent)`; a comment in both places names the other).
- Keep "the status tokens are unchanged", the brand, persona-badge and spotlight checks. Leave the contour-line and panel checks for now (they go in Task 11 with the features).
- Add the no-monospace test:

```ts
// Billabong uses one family, Rubik, with tabular digits for numbers (design doc section 3).
it('no monospace in app/ or components/', () => {
  const files = walk(['app', 'components']).filter((f) => /\.(m?[jt]sx?|css)$/.test(f));
  const hits = files.flatMap((f) => readFileSync(f, 'utf8').split('\n').map((line, i) => [f, i + 1, line] as const))
    .filter(([, , line]) => /\bfont-mono\b|monospace/.test(line));
  expect(hits.map(([f, n]) => `${f}:${n}`)).toEqual([]);
});
```

  (write the small `walk()` helper with `readdirSync` recursion in the test file). This also matches comments; say so in a comment.

Run `pnpm test tests/lib/tokens.test.ts`: the new tests fail (missing tokens, `font-mono` hits).

**Step 2: The palette.** In `app/globals.css`, replace the `:root` and `[data-theme="dark"]` values with the design doc's table (section 2): `--bg`, `--surface`, `--neutral-bg`, `--fg`, `--muted-fg`, `--border` (light `#d6d8cf`, dark `#3a3c34`: decorative), `--border-strong`, `--primary`, `--on-primary`, new `--primary-ledge`, `--accent`, new `--hl-amber` (`#f2a93b`), `--hl-sage` (`#9cc5a1`), `--hl-sky` (`#7fb3d5`) in both themes. Keep `--danger`, `--scrim`, status tokens, `--brand`, `--brand-2`, `--spark`, `--logo`, `--on-logo`, the panel tokens and `--spot-mix` for now. Add `--color-primary-ledge`, `--color-hl-amber`, `--color-hl-sage`, `--color-hl-sky` to `@theme inline`. Update the comment block above to describe Billabong.

**Step 3: Rubik.** In `app/layout.tsx`, replace Geist with:

```tsx
import { Rubik } from 'next/font/google';

const rubik = Rubik({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap', variable: '--font-rubik' });
```

and `className={rubik.variable}` on `<html>`. In `@theme inline`: `--font-sans: var(--font-rubik), ui-sans-serif, system-ui, sans-serif;` and remove `--font-mono`. Body: `@apply bg-bg text-fg font-sans antialiased; line-height: 1.6;` (16px stays the default). If `geist` is then unused by the app (`grep -rn "geist" app components lib`), remove the package; the PDF's TTFs are separate files and stay.

**Step 4: Plain numbers.** Replace `font-mono` with `num` in every file the test lists. Where an element already has `num`, drop `font-mono`. Where the text is not a number (a type label, a hostname), drop `font-mono` and add nothing. Where `font-mono` gave emphasis (a word in a dialog), use `font-semibold`.

**Step 5:** `pnpm test tests/lib/tokens.test.ts` → PASS. Then the gate. In the screenshots: grey-beige page, Rubik everywhere, eucalyptus links, the old buttons now amber with dark text (they read `bg-primary text-on-primary`).

**Step 6: Commit.** `feat(theme): Billabong palette, Rubik, plain numbers`. Add a Task 1 entry to design doc section 11 (size, any value adjusted to pass a check).

---

### Task 2: Chunky buttons

**Files:**
- Modify: `components/ui/button.tsx`, `app/globals.css`
- Create: `tests/components/button.test.tsx`
- Modify: `tests/e2e/showcase.spec.ts` (the coloured-strip check: button-ledge exception, with a comment citing design doc section 5)
- Create or modify: an e2e check in `tests/e2e/liftoff.spec.ts` or a new `tests/e2e/billabong.spec.ts`

**Step 1: Tests first.** `tests/components/button.test.tsx` (jsdom): primary renders `bg-primary text-on-primary` with the ledge class (`border-b-[3px] border-b-primary-ledge` or the `ledge` utility below); secondary has the `border-strong` outline and ledge; `buttonClasses()` still works for links; `md` keeps `min-h-11`, `sm` `min-h-9`. In e2e: a primary button's computed `border-bottom-width` is `3px` and its colour equals `--primary-ledge`; under `reducedMotion: 'reduce'`, pressing (mouse down) changes no `transform`/`translate`; with motion allowed, mouse down translates it by 2px.

**Step 2: Implement.** A `ledge` utility in `app/globals.css`:

```css
/* Chunky buttons (design doc section 4): a 3px bottom edge in a darker shade of the button. Pressing
   shrinks it and moves the button down, so it reads as pushed in. The only coloured edge allowed. */
@utility ledge {
  border-bottom-width: 3px;
  transition: translate 150ms ease-out, border-bottom-width 150ms ease-out;
  @media (prefers-reduced-motion: no-preference) {
    &:active:not(:disabled) { translate: 0 2px; border-bottom-width: 1px; }
  }
}
```

Variants in `button.tsx`:

```ts
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary border border-primary-ledge ledge font-semibold hover:brightness-105',
  secondary: 'bg-surface text-fg border border-border-strong ledge hover:bg-neutral-bg',
  ghost: 'bg-transparent text-fg border border-transparent hover:bg-neutral-bg',
  danger: 'bg-danger text-on-danger border border-danger ledge',
};
```

Keep sizes, `iconOnly`, focus ring, disabled styles. Remove the old `motion-safe:active:scale-[0.98]` (the ledge replaces it). If `danger` needs readable text on `--danger` in both themes, add `--on-danger` (white light, `#151515` dark) with a tokens test.

**Step 3: The strip check.** In `showcase.spec.ts`, the coloured-strip assertion ignores the bottom border of elements that carry the `ledge` utility, and nothing else; comment cites design doc section 5. Add an assertion that only `button`/`a` elements carry `ledge`.

**Step 4:** Gate; look at every page's buttons in both themes.

**Step 5: Commit.** `feat(ui): chunky buttons with a ledge`.

---

### Task 3: Top bar, mobile header and bottom nav

**Files:** `components/layout/top-nav.tsx`, `mobile-header.tsx`, `bottom-nav.tsx`, `brand-link.tsx`, `persona-chip.tsx`, `nav-items.ts` (read only); tests touching them; `tests/e2e/a11y.spec.ts` (unchanged, must pass).

**Steps:**
1. Top bar: `<header>` sticky (`top-0` plus the safe-area inset), its inner bar inset 8px from the edges (`mx-2 mt-2`), `rounded-lg bg-neutral-bg border border-border`, height 56px. Logo and nav links on the left (active item: `text-fg font-semibold` with a 3px `--accent` underline inside the bar, the existing state indicator). On the right: persona chip, then a primary `Button size="sm"` "Start assessment" linking to `/assess/` (hidden when the path starts with `/assess`).
2. Mobile header: the same inset rounded bar, logo and persona chip. Bottom nav: an inset rounded bar at the bottom (`mx-2 mb-[max(0.5rem,env(safe-area-inset-bottom))]`), active item `text-accent font-semibold`.
3. Keep landmarks, `aria-current`, the 44px targets, the skip link and `main`'s padding (adjust `pt`/`pb` in `app/layout.tsx` so content clears the sticky bars).
4. Tests: a unit test that the "Start assessment" button is absent on `/assess/` paths and present elsewhere; e2e that the top bar is sticky (still visible after scrolling 1,000px) and does not cover the skip link's target.
5. Gate; commit `feat(layout): inset top bar and bottom nav`.

---

### Task 4: Window, Highlight, tabs and pills

**Files:**
- Create: `components/ui/window.tsx`, `components/ui/highlight.tsx`, `tests/components/window.test.tsx`, `tests/components/highlight.test.tsx`
- Modify: `components/ui/tabs.tsx`, `components/ui/badge.tsx`, `components/ui/status-pill.tsx`, `app/globals.css`, `tests/components/tabs.test.tsx`, `tests/components/status-pill.test.tsx`

**Step 1: Window, test first.** Behaviour to test: renders a `section` labelled by its title when `title` is given (`aria-labelledby`), the title as an `h2` by default (`as` prop for `h3`), decorative controls with `aria-hidden="true"` and no focusable elements inside them, children in the body.

```tsx
type WindowProps = { title: ReactNode; as?: 'h2' | 'h3'; actions?: ReactNode; className?: string; bodyClassName?: string; children: ReactNode };

/** A panel framed like a desktop window (design doc section 4). The controls are decoration only. */
export function Window({ title, as: Heading = 'h2', actions, className, bodyClassName, children }: WindowProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border),0_8px_24px_-16px_rgb(0_0_0/0.35)]', className)}>
      <div className="flex items-center gap-3 border-b border-border bg-neutral-bg px-3 py-2">
        <Heading id={id} className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</Heading>
        {actions}
        <span aria-hidden="true" className="flex items-center gap-2 text-muted-fg">
          <Minus size={16} strokeWidth={1.5} /><Square size={16} strokeWidth={1.5} /><X size={16} strokeWidth={1.5} />
        </span>
      </div>
      <div className={cn('p-4 md:p-6', bodyClassName)}>{children}</div>
    </section>
  );
}
```

(It has `useId`, so it is a client component or takes an `id` prop; prefer an explicit `id` prop computed by the caller only if the server-component pages need it. Decide by where it is used and say why.)

**Step 2: Highlight, test first.** `<Highlight tone="amber|sage|sky">` renders `<mark>` with the `highlight` utility and a tone class; `mark` keeps `color: inherit` (so it inherits `--fg`), and a unit test asserts that `Highlight` is never given a muted text class (the component sets `text-fg`).

```css
/* Marker highlight (design doc section 2): HIGHLIGHT_ALPHA (lib/highlight.ts) of a tone over the page,
   behind --fg text only. A slight skew and rounded ends, like a pen stroke. */
@utility highlight {
  color: var(--fg);
  background: color-mix(in srgb, var(--hl, var(--hl-amber)) 35%, transparent);
  border-radius: 0.3em 0.15em;
  padding-inline: 0.15em;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
```

Tones set `--hl` (`[--hl:var(--hl-sage)]`, …). Forced-colors: `@media (forced-colors: active) { mark { background: Mark; color: MarkText; } }`.

Task 1 review notes: write the highlight as this custom rule, never a Tailwind `/35` opacity modifier (its `@supports` fallback paints the tone at full strength, and `--fg` on a full-strength highlight is under 2:1 in dark); check the built CSS for a non-mixed fallback. Add a tokens test that reads the `35%` from the `highlight` rule in `globals.css` and checks it equals `HIGHLIGHT_ALPHA * 100`, and fix `lib/highlight.ts`'s comment to point at the real rule.

**Step 3: Tabs.** The active tab gets a 3px `--accent` underline and `text-fg font-semibold`; inactive `text-muted-fg hover:text-fg`; keep roles, keyboard and the existing tests (assertions unchanged).

**Step 4: Pills.** `Badge` and `StatusPill`: `rounded-full`, 1px outline (`border-border-strong` for neutral/outline tones, transparent for filled status tones), `text-xs font-medium`, icons 16px. Status colours unchanged. Existing assertions stay.

**Step 5:** Gate (no page uses Window or Highlight yet except tests; screenshots show tabs and pills). Commit `feat(ui): window frame, marker highlight, tabs and pills`.

---

### Task 5: Programs

**Files:** `app/programs/page.tsx`, `components/programs/*` (directory, filter-chips, program-card, program-detail, eligibility-list, persona-notes, personalised, add-to-pipeline, closing-soon-strip, deadline-text, program-status, stale-badge), their tests.

**Steps:**
1. Directory intro: the page heading keeps its text; one `Highlight` on the key phrase of the intro (`--fg` text only).
2. Filter chips: rounded-full outline chips; pressed state `bg-fg text-bg` or `bg-primary text-on-primary` (pick the one with clearer state in both themes; check contrast; `aria-pressed` unchanged).
3. Program cards: `bg-surface border-border rounded-lg`, spotlight kept, title `font-semibold`, amounts with `num`.
4. Detail page: sections ("Who it's for", "Eligibility", "How to apply", "Sources", …) as `Window`s with the section name as title; the "Add to plan" primary button; `num` for dates/amounts.
5. Empty results: playful line ("No programs match. Even the platypus couldn't find one.") plus the existing "Clear filters" action, and an `Art` placeholder slot (Task 10 makes `Art`; until then leave a `{/* Art: platypus-search */}` marker and no image).
6. Tests: keep all assertions; update queries only where roles changed (comment if so).
7. Gate; commit `feat(programs): Billabong directory and detail`.

---

### Task 6: Assess wizard

**Files:** `app/assess/page.tsx`, `components/assess/wizard.tsx`, `question.tsx`, `components/ui/choice-group.tsx`, `field.tsx`, tests (`wizard-finish.test.tsx`, journey e2e).

**Steps:**
1. The wizard sits in one `Window` titled with the step ("Step 2 of 6: Your company").
2. Choice cards: `bg-surface border-border-strong rounded-lg`, checked state `border-accent` with a 2px ring and a check icon (not colour alone), 44px targets kept.
3. Progress bar: amber fill (`bg-primary`) on `bg-neutral-bg`, the only coloured bar (a progress indicator, allowed).
4. Navigation: primary "Next", secondary "Back".
5. Tests unchanged in substance; gate; commit `feat(assess): wizard in a window`.

---

### Task 7: Results

**Files:** `components/results/results.tsx`, `funding-summary.tsx`, `assessment-row.tsx`, tests.

**Steps:**
1. Page heading with one `Highlight`.
2. Funding summary as a `Window` titled "Your funding estimate", numbers large with `num`, the "not secured" wording unchanged.
3. Suggested first goal: a card with the primary "Add goal" button.
4. Tabs restyled (Task 4); result rows as cards; "Not a fit" rows keep their greyed treatment and reason text.
5. Celebration copy may be playful (toast text), the reasons stay plain.
6. Gate; commit `feat(results): Billabong results`.

---

### Task 8: Plan

**Files:** `components/plan/*`, `components/calendar/add-to-calendar.tsx`, `components/ui/dialog.tsx`, `menu.tsx`, tests.

**Steps:**
1. Pipeline columns as `Window`s (title "Considering", "Preparing", …, count in `num`).
2. Application cards: `bg-surface`, outline, the stage menu and "Move to…" as secondary buttons.
3. Dialogs: `Window`-style title bar (same look) with a real close button (the decorative controls are not used in dialogs); `ConfirmDialog` keeps its behaviour; danger button with ledge.
4. Menus: `bg-surface border-border rounded-lg` popovers.
5. Calendar: today cell `bg-accent text-bg` (checked pair), events as small pills.
6. Progress ring keeps `--brand`.
7. Gate; commit `feat(plan): Billabong plan, goals and calendar`.

---

### Task 9: Report, Settings, 404 and error

**Files:** `components/report/*`, `components/settings/settings.tsx`, `app/not-found.tsx`, `app/error.tsx`, `components/layout/storage-banner.tsx`, `backup-prompt.tsx`, tests.

**Steps:**
1. Report builder options in a `Window`; the preview in a `Window` titled "Preview"; the download button primary with `loading` state (spinner icon 16px). The PDF itself is unchanged.
2. Settings sections as `Window`s; theme choice and celebrations toggle unchanged in behaviour; data-reset danger button with ledge; copy stays plain.
3. 404: a `Window` titled "404", playful line ("This page went for a swim."), primary "Browse programs"; `Art` slot for platypus-search.
4. Error page: plain copy, same layout.
5. Banners: `bg-warn-bg text-warn-fg` callouts with an outline and the existing buttons.
6. Gate; commit `feat(ui): report, settings and error pages`.

---

### Task 10: Art pipeline and placeholders

**Files:**
- Create: `scripts/process-art.mjs`, `tests/lib/process-art.test.ts`, `components/ui/art.tsx`, `lib/art.ts` (the manifest), `tests/components/art.test.tsx`, `art/originals/.gitkeep`, `art/README.md`
- Modify: `package.json` (`"art": "node scripts/process-art.mjs"`; `sharp` as an exact devDependency, the version Next already installs: check `pnpm why sharp`)

**Step 1: Manifest.** `lib/art.ts` lists every asset from `docs/art/billabong-prompts.md` with its base name, intrinsic size, default `alt` (or `null` for decorative), and an optional dark partner:

```ts
export type ArtName = 'hero-diorama' | 'platypus-wave' | 'platypus-reading' | 'platypus-celebrate' | 'platypus-search' | 'prop-filing-cabinet' | 'prop-compass' | 'prop-stamp' | 'step-answer' | 'step-sort' | 'step-plan';
export const ART: Record<ArtName, { file: string; dark?: string; width: number; height: number; alt: string | null }> = { … };
export const ART_WIDTHS = [480, 960, 1440] as const;
```

**Step 2: Script, tests first.** `scripts/process-art.mjs` exports pure helpers (`outputsFor(name, widths)` → the AVIF/WebP paths; `missing(manifest, files)` → which originals are absent) tested in `tests/lib/process-art.test.ts`; its `main()` (only when run directly) reads `art/originals/<file>.png`, writes `public/art/<file>-<w>.avif` and `.webp` at each width not larger than the original (sharp, `avif({ quality: 55 })`, `webp({ quality: 78 })`, alpha kept), and prints a table of sizes; fails if the hero's 1440 AVIF exceeds 120KB. Missing originals are listed, not errors.

**Step 3: Art component, tests first.** `components/ui/art.tsx`:
- renders a `<picture>` with `<source type="image/avif" srcSet>` / webp and an `<img>` with `width`/`height`, `alt` from the manifest (or `alt=""` + `aria-hidden` when decorative), `loading="lazy"` unless `priority`, `decoding="async"`, `sizes` from a prop;
- light/dark: when the asset has a dark partner, render both `<picture>`s and hide one with `dark:hidden` / `hidden dark:block` (CSS only, no hydration flash; the theme is set before paint);
- when the processed files don't exist yet (the manifest marks `ready: false`, generated by the script into `lib/art-ready.json`), render a placeholder `div` of the same aspect ratio: `bg-neutral-bg rounded-lg` with a 16px `ImageIcon` centred, `aria-hidden`.
- Tests: same box for placeholder and image (aspect ratio), the decorative case hides from assistive tech, the dark partner swaps by class.

**Step 4:** Use `Art` in the slots left by Tasks 5 and 9 (`platypus-search`). Gate; commit `feat(art): art pipeline, Art component and placeholders`.

---

### Task 11: Home page

**Files:** `app/page.tsx`, `components/home/*`, `lib/aurora.ts`, `lib/aurora-shader.ts`, `lib/celebrate.ts`, `scripts/js-size.mjs` (`LAZY_ONLY`), tests for each, `tests/e2e/showcase.spec.ts`, `liftoff.spec.ts`, `motion.spec.ts`, `screens.spec.ts`.

**Steps:**
1. Remove the contour hero: delete `components/home/hero-aurora.tsx`, `aurora-canvas.tsx`, `lib/aurora.ts`, `lib/aurora-shader.ts` and their tests (`aurora*.test.ts(x)`, `hero-aurora*.test.tsx`); remove the contour-line and pause-button tests from `showcase.spec.ts` and the contour checks from `tests/lib/tokens.test.ts`, each removal noted in the commit message and design doc section 11 (feature removed). Remove `gl_FragColor` from `LAZY_ONLY` (keep the mechanism and its tests with a fixture marker). Remove `body:has([data-hero-aurora])` from globals.css.
2. Hero: two columns from `md` (text left, `Art name="hero-diorama" priority` right), stacked on phones (art below the call to action). Headline with one `Highlight` (amber) on "qualifies for"; keep the `rise` entrance; primary "Start free assessment", secondary "Browse programs"; hero stats with `num`.
3. Persona cards: cards with spotlight, `platypus-wave` art on the first card (or above the row), tones kept.
4. Sorting story: chips as small `bg-surface` cards with outline; all motion rules unchanged (`showcase.spec` sorting tests must pass unchanged).
5. How it works: three `Window`s ("1. Answer six questions", "2. See what fits", "3. Plan the applications": a real sequence, so numbering is allowed) on the page background, each with its `step-*` art and its existing preview animation; remove the forest panel and the `--panel-*` tokens and their tests if nothing else uses them (feature replaced; cite).
6. The hero's `glow-brand` utility (a eucalyptus glow) sits under an amber button now: remove it, or retune it to a soft amber with its comment updated (Task 1 review).
7. Celebrations: `BRAND_COLOURS` in `lib/celebrate.ts` become amber, sage and sky (light and dark); update the confetti test.
8. `pnpm size`: the home page must stay within budget (it should drop: the contour canvas chunk is gone from the lazy set, and nothing new loads up front).
9. Gate (all showcase, liftoff, motion specs); commit `feat(home): Billabong hero, personas and How it works; contour hero removed`.

---

### Task 12: Copy pass

**Files:** components and pages with headlines, empty states, toasts (`lib/toast.ts` callers, `lib/celebrate.ts` messages), the 404.

**Steps:**
1. List every user-facing string in those places (grep), propose playful versions in a table in the design doc (section 11), keeping eligibility, amounts, deadlines, caveats and data settings plain.
2. Apply them; tests that assert exact strings change with a comment citing design doc section 7.
3. Gate; commit `feat(copy): Billabong voice for headlines, empty states and celebrations`.

---

### Task 13: Docs and final check

**Files:** `CLAUDE.md`, `README.md`, `docs/plans/2026-10-31-billabong-design.md`.

**Steps:**
1. `CLAUDE.md`: Overview and Design system rewritten for Billabong (palette, Rubik, `num`, buttons and the ledge exception, `Window`, `Highlight`, `Art` and `pnpm art`, highlights behind `--fg` only, the platypus and the copy rule); Structure (`components/ui/window.tsx`, `highlight.tsx`, `art.tsx`, `lib/art.ts`, `scripts/process-art.mjs`, `art/originals/`); Motion (contour hero removed; the sorting story now pins from 40rem tall with pin-short below 54rem, under the sticky bar, Task 3); the `html` scroll-padding now clears the sticky bar at every width (Task 3); Testing (what moved); `pnpm size` figure.
2. README: the design line and `pnpm art`.
3. Design doc section 11 complete.
4. Full gate; look at every page in both themes at both widths.
5. Commit `docs: Billabong in CLAUDE.md and README`.

## After Task 13

Report to the owner with screenshots (before and after), the final `pnpm size`, every test change of the allowed kinds, and which art is still placeholder. Offer to merge or open a PR; never push or merge without their go-ahead.
