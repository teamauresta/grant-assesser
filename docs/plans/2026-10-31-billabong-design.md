# Billabong: Grant Navigator in the posthog.com style

Date: 31 Oct 2026. Status: approved by the owner ("go ahead", after the design summary in chat).

## Why

The owner asked to adopt the design system in their PostHog fork. We first built on Quill, the dense component library inside the PostHog app (`quill` branch, Tasks 1 to 6, kept but not merged). Seeing it side by side with the live site, the owner said they had expected the art style of https://posthog.com, not the app's. Billabong is that style, applied to Grant Navigator with original artwork.

What posthog.com does, and what we take:

| posthog.com | Billabong |
|---|---|
| A retro computer desktop with windows and app icons | Not taken: normal pages and navigation (owner's choice). Only the window frame is used, on key panels. |
| Grey-beige page, near-black text | Taken: `#EEEFE9` page, `#151515` text |
| Chunky amber buttons with a darker ledge | Taken: amber primary buttons with dark text, white secondary buttons, both with a ledge |
| Marker highlights behind key phrases | Taken, in amber, sage and sky, behind main text only |
| 3D illustrated scenes, a hedgehog mascot, retro props | Our own: a clay-style billabong diorama, a platypus mascot and retro office props, made by the owner with gpt-image-2.5 from `docs/art/billabong-prompts.md` |
| Rounded custom font (RoundHog) | Rubik from Google Fonts, through `next/font` |
| Cheeky copy | Playful in headlines, empty states, the 404, celebrations and toasts; plain and exact for eligibility, amounts, deadlines, caveats and the PDF |

Nothing of PostHog's brand is copied: no hedgehogs, logo, RoundHog font, 3D scenes or product art.

## 1. Base

- New branch `billabong` from `main` (`d9eeef8`, the live Eucalyptus site). The `quill` branch stays as it is.
- Carried over from the Quill work: dates and amounts in the body font with tabular digits (`num`) instead of `font-mono`, and the test that forbids monospace in `app/` and `components/`.
- Kept: every test, the accessibility suite, the static export and the first-load budget (`pnpm size`).

## 2. Palette

All pairs checked against WCAG; the numbers are contrast ratios.

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--bg` | `#eeefe9` | `#1c1d19` | page |
| `--surface` | `#fafaf7` | `#25261f` | cards and window bodies |
| `--neutral-bg` | `#e5e7e0` | `#2e3028` | window title bars, neutral pills |
| `--fg` | `#151515` | `#f1f0ea` | 15.8 / 14.8 on `--bg` |
| `--muted-fg` | `#52544b` | `#aeb0a6` | 6.7 / 7.7 on `--bg`, ≥ 6.1 on every surface |
| `--border` | neutral, decorative | | separation only |
| `--border-strong` | `#85877d` | `#74776c` | form controls, outlines; ≥ 3.1:1 |
| `--primary` | `#f2a93b` | `#f2a93b` | amber buttons |
| `--on-primary` | `#151515` | `#151515` | 9.1 on amber |
| `--primary-ledge` | `#b87512` | `#b87512` | the button's bottom edge |
| `--accent` | `#1f5c4a` | `#86c9a9` | eucalyptus: links, focus ring, eligible states; 6.8 / 8.8 |
| `--brand`, `--brand-2`, `--spark` | eucalyptus, sage, ochre | as today | brand moments only |
| `--hl-amber`, `--hl-sage`, `--hl-sky` | 35% amber / sage `#9cc5a1` / sky `#7fb3d5` over `--bg` | same mix over the dark `--bg` | `--fg` on them ≥ 12.6 light, ≥ 6.6 dark |

- Status colours (`--ok-*`, `--warn-*`, `--danger`) are unchanged and stay in `StatusPill` only.
- Highlights sit behind `--fg` text only. Dark `--muted-fg` on a highlight is about 3.5:1, so muted text never gets one.
- The calendar's today cell, the persona badges, the spotlight and the panel tokens keep their existing checks, re-run with the new values.

## 3. Type

- Rubik (Google Fonts, through `next/font/google`, self-hosted at build) for everything. The variable font, so every weight from 300 to 900 is real; the app uses 400 to 700.
- Body text 16px with a 1.6 line height. Headings bold and tight. The hero headline is the only display size.
- `num` (tabular digits) for dates, amounts, scores and counts. No monospace anywhere in the app.
- The PDF report keeps its own embedded Geist.

## 4. Signature pieces

- **Buttons** (`components/ui/button.tsx`):
  - Primary: amber with dark text, a 3px `--primary-ledge` bottom border, and a 1px darker outline.
  - Secondary: `--surface` with `--fg` text, a `--border-strong` outline and a 3px ledge in the same colour.
  - Ghost: as today.
  - Danger: as today, with a ledge.
  - Pressing moves the button 2px down and shrinks the ledge, so it reads as pushed in. There is no movement under reduced motion.
  - Heights stay at 44px (`md`) and 36px (`sm`).
- **Windows** (`components/ui/window.tsx`): a panel with a title bar on `--neutral-bg` holding the panel's title and decorative window controls, which are `aria-hidden` and do nothing. The body sits on `--surface`. It is used by role, not everywhere:
  - the results summary
  - the program detail sections
  - the report preview
  - the plan's pipeline columns
  - the How it works steps
  - the 404
- **Highlights** (`highlight` utility, or a `Highlight` component wrapping `<mark>`): a slightly skewed, rounded marker band behind a phrase. It is used in the hero headline and in page intros, at most once per heading.
- **Top bar**: an inset, rounded menu bar on `--neutral-bg`, 8px from the page edges, sticky. The logo and the nav links are on the left. On the right are the persona chip and an amber "Start assessment" button, hidden on `/assess/`. The mobile header and the bottom nav take the same treatment.
- **Tabs**: a 3px underline in `--accent` on the active tab.
- **Pills and badges**: fully rounded with a 1px outline. Status colours are unchanged.
- **Cards**: `--surface`, a 1px `--border` outline, an 8px radius, and the existing spotlight. There is no shadow except the window's soft one.

## 5. CLAUDE.md rules that change (owner's decisions)

- "No decorative coloured strips, edges or bars": a button's ledge is part of the control's shape and is allowed. It is a darker shade of the button's own fill and appears only on buttons. Highlights are backgrounds behind text, not strips. The rule still holds everywhere else.
- "No emoji. Icons from `lucide-react` only" still holds. The platypus and props are illustrations, not icons.
- The hero contour lines (WebGL) are removed. Their pause button, `gn-aurora` setting and still frame go with them. The 5-second motion rule stays.

## 6. Artwork

- The owner generates the images with gpt-image-2.5 from `docs/art/billabong-prompts.md`: a character sheet, the day and dusk hero dioramas, four platypus poses, three props and three How it works spots.
- The originals go in `art/originals/`, which is not deployed. `scripts/process-art.mjs` writes AVIF and WebP at 1x and 2x into `public/art/`.
- `components/ui/art.tsx` renders them:
  - a `<picture>` with explicit width and height, so the layout doesn't shift
  - `loading="lazy"` except for the hero
  - a light/dark pair switched by the theme
  - real `alt` text, or `alt=""` with `aria-hidden` where the image is decorative
- Until an image exists, a neutral placeholder of the same size is shown. The build never waits on art.
- Images cost page weight, not JavaScript. A size check keeps the hero under about 120KB in AVIF.

## 7. Copy

- Playful in headlines, empty states, the 404, celebrations and toasts. For example, the 404: "This page went for a swim."
- Plain and exact for eligibility reasons, amounts, deadlines, caveats, the PDF and the settings for your data.
- Australian English, as today.

## 8. Home page

- **Hero:** headline with one highlight, intro, an amber primary call to action and a secondary one, the hero stats, and the day or dusk diorama to the right (below on phones).
  - The contour canvas, its shader, `lib/aurora*` and their tests are removed.
  - The `LAZY_ONLY` shader marker goes too, and `pnpm size` keeps the check mechanism for the remaining lazy code.
- **Persona cards:** cards with the platypus waving on the first one, and with icon tones as today.
- **The sorting story:** kept, with chips restyled as small cards on `--surface`. Its motion rules are unchanged.
- **How it works:**
  - The forest-green panel becomes three windows, one per step, each with its spot illustration and its existing preview animation.
  - The `--panel-*` tokens go if nothing else uses them.
- **Celebrations:** confetti in amber, sage and sky.

## 9. Testing

- `tests/lib/tokens.test.ts`:
  - It takes the new values and the new pairs: `--on-primary` on amber, `--fg` on each highlight, `--border-strong` and the ledge at 3:1 on the page.
  - The status-token check stays.
  - The contour-line and panel checks go with the features (requirement change, cited).
- `showcase.spec.ts` and `liftoff.spec.ts`:
  - The contour-line tests go with the canvas.
  - The coloured-strip check gains the button-ledge exception.
  - Gradient text is still forbidden.
- New tests:
  - buttons: the ledge, the press, no movement under reduced motion
  - windows: decorative controls are hidden from assistive tech, and the title is a heading where it labels a region
  - highlights: they only wrap `--fg` text
  - art: the placeholder and the image keep the same box, and dark mode swaps the image
- axe on every page in both themes, as today. `pnpm size` within budget after every task.

## 10. Order

1. Tokens, Rubik, `num`, button, top bar (no art needed).
2. Window, highlight, tabs, pills.
3. Pages: programs, assess, results, plan, report and settings.
4. Art pipeline and placeholders; home page (hero, persona cards, sorting story, How it works, celebrations); contour removal.
5. Copy pass.
6. Docs: `CLAUDE.md`, README, this doc as built.

Each task ends with typecheck, lint, unit tests, e2e with axe, build and size, and a look at screenshots in both themes, followed by a spec review and a code-quality review.

## 11. What changed during the build

(Filled in as tasks land.)

- **Task 1 (palette, Rubik, plain numbers).** The section 2 values went in unchanged: every existing contrast check passed with them (`--spark` on `--neutral-bg` is 4.39 in light, but no check pairs them and brand colours never sit on title bars). One token added: the danger button's label used `--on-primary`, which is now dark, and dark text on the light `--danger` is 2.8:1 (axe failed on `/settings/`). New `--on-danger`, `#ffffff` light (as before) and `#151515` dark (6.5 / 6.6), with its own check in `tests/lib/tokens.test.ts`. Rubik is self-hosted by `next/font` (latin preloaded, other subsets by `unicode-range`; no request to Google from `out/`); the `geist` package is removed and the PDF keeps its Geist TTFs. Home first-load JS 279,481 bytes gzipped (279,493 before).
- **Task 1 follow-up.** Rubik loads as the variable font (no weight list): the first cut listed 400, 500 and 700, so `font-semibold` (600) drew at 700. Same files and the same 35KB latin preload; `@font-face` now declares `font-weight: 300 900`. `--font-mono` is unset in `@theme`, so the `font-mono` utility no longer exists, and the no-monospace test also scans `lib/` and matches `--font-mono`. `code`, `pre` and `kbd` fall back to Tailwind's system monospace stack; the app renders none.
- **Task 2 (chunky buttons).** Primary, secondary and danger have a 3px bottom edge (`border-b-3`, which Tailwind emits after `border`) in the border's own colour, a darker shade of the button (`--primary-ledge` on amber, `--border-strong` on the white secondary, new `--danger-ledge` on red). The `ledge` utility (`app/globals.css`) is the press and the marker the tests use: pressing moves the button 2px down and shrinks the edge to 1px, inside `@media (prefers-reduced-motion: no-preference)`, so nothing moves under reduced motion. While pressed, a `::before` (`inset: -3px -1px -1px`, on a `position: relative` button) covers where the button's top was, so a press held near the top edge still releases on the button and clicks (without it, the hit box moved away and no click fired). The transition lives in `buttonClasses()` (opacity, background, border colour, filter, translate, bottom width), not the utility, so the two do not overwrite each other. New token `--danger-ledge`: `#7f1d1d` light (8.7 on `--bg`), `#dc2626` dark (3.5), each darker than its `--danger`, with a check in `tests/lib/tokens.test.ts`. Secondary is now `--surface` with a `--border-strong` outline (it was `--bg`, which read as a grey chip on the lighter cards); hovers are `brightness-105` (primary, danger) and `--neutral-bg` (secondary, ghost); primary is semibold. The old 0.98 press scale is gone. A new `lg` size (`min-h-12 px-6 text-base`, icon `size-12`) for the hero's calls to action: they passed those classes as `className`, and since `cn()` does not merge Tailwind classes, md's `text-sm` won and they drew at 14px. `className` on a button is now layout only (margin, flex, self, width, shrink), and `tests/components/button.test.tsx` scans `app/` and `components/` for call sites passing size, padding, text, background, border or cursor classes; the dismiss buttons' icon colours moved onto their icons, and the "Added" buttons lost a conflicting `cursor-default`. The coloured-strip check in `showcase.spec.ts` ignores only the bottom width of an element carrying `ledge` (its colour must still match the other sides) and asserts the ledge is only on buttons and links; `tests/e2e/billabong.spec.ts` checks the ledge width and colour per variant, the press, a slow press at the top edge, no movement under reduced motion, and ledge carriers on every page. Home first-load JS 279,524 bytes gzipped.
- **Task 3 (top bar, mobile header, bottom nav).** Each bar is an inset, rounded bar (`rounded-lg border border-border bg-neutral-bg`, `components/layout/inset-bar.ts`) inside a full-width `bg-bg` band, so content scrolling behind it never shows through the 8px gap or under a notch. The top bars are sticky (`top-0`); the 8px gap and the safe-area inset are the band's padding (`pt-[calc(0.5rem+env(safe-area-inset-top))]`), not the bar's `mt-2`, which collapsed through the band and left the bar stuck to the top (the e2e caught it). The desktop bar: logo and nav links on the left (active item `text-fg font-semibold` with a 3px `--accent` underline resting on the bar's bottom edge; hover `--bg`), then the persona chip and a primary `sm` "Start assessment" link to `/assess/`, absent on `/assess/` and below it (`isActivePath`). Between `md` and `lg` there is no room for everything: the nav icons and the product name hide (the name stays the logo link's accessible name). The persona chip is an outline pill on `--surface`, drawn 36px tall to sit level with the button, with a `::before` that keeps its target 44px (`-inset-y-[5px]`: it is placed against the padding box, inside the 1px border, so the first cut's `-inset-y-1` gave only 42px; an e2e hit test now checks 21px above and below the centre); nav items keep 44px, the bottom nav's 56px. The bottom nav is the same bar fixed at `mb-[max(0.5rem,env(safe-area-inset-bottom))]`, active item `text-accent font-semibold`. `app/layout.tsx` needed no change: the sticky headers are in the page flow, so `main` starts below them, and the fixed bottom nav (66px with its gap) sits inside `main`'s existing bottom padding (6rem plus the safe area). `html { scroll-padding-top }` is now `calc(5rem + env(safe-area-inset-top))` at every width (it was 4.5rem below `md` only), so the skip link's target and anchors clear the sticky bar. The sorting story's pinned block now sticks below the bar (`top-[calc(4rem+…)]`, `min-h-[calc(100dvh-4rem-…)]`; the scroll range and `pinProgress` are unchanged), and the `pin` and `pin-short` thresholds moved up by the bar's 4rem (pin from 40rem tall, pin-short below 54rem, `PIN_QUERY` to match), so each layout keeps the window it was designed for: at 36rem tall the pinned block would have run 12px off screen. So a 1280 × 800 window now shows the pin-short layout, and windows 36–40rem tall settle once instead of pinning. The `ledge` utility's pressed hit-area keeper moved from `::before` to `::after`, since `spotlight` owns `::before` (inset 0, no pointer events) and would cancel it on an element carrying both. Tests: `tests/components/top-nav.test.tsx` (the call to action on and off `/assess/`, landmarks, `aria-current`, the bar classes, 44px nav targets, the mobile header and bottom nav); `tests/e2e/billabong.spec.ts` "top bar" (still at the top and inset 8px after scrolling 1,000px, the skip link's target and `/settings/#your-data` below the bar). Home first-load JS 279,777 bytes gzipped (the layout now imports `buttonClasses`).
- **Task 3 review.** Bar sizes have one source: `--bar-h` (`calc(4.5rem + env(safe-area-inset-top))`, the top band: 8px, the 56px bar, and now 8px under it too, `pb-2`, so scrolled content no longer cuts flush against the bar's edge) and `--bottom-bar-h` (`calc(3.625rem + max(0.5rem, env(safe-area-inset-bottom)))`, the 58px bottom bar and the gap under it) in `app/globals.css`, plus `--wizard-footer-h` (4.3125rem). The bands are those heights (`h-(--bar-h)`, `h-(--bottom-bar-h)`; the bottom bar lost its `mb-[max(…)]`), and `scroll-padding-top` (`--bar-h` + 0.5rem), the sorting story's pinned block (`pin:top-(--bar-h)`, `min-h-[calc(100dvh-var(--bar-h))]`), `main`'s bottom padding (`--bottom-bar-h` + 2rem; so `app/layout.tsx` did change after all), the toasts and the "Updated from another tab" notice use them; `components/layout/inset-bar.ts` lists the users. The pin thresholds stay 40rem and 54rem (35.5rem and 49.5rem of window under the band); measured at 1280 wide, the call to action's bottom is 610 of 640, 690 of 800, 722 of 863 (pin-short), 814 of 864 and 832 of 900 (full layout). `PIN_QUERY` is exported and `tests/components/sort-story.test.tsx` checks the `pin` and `pin-short` variants against it. Fixes: the wizard's phone footer still sat 56px + 1px up (the old nav), so its bottom 9px was behind the new 66px band; it now sits at `bottom-(--bottom-bar-h)` and is `--wizard-footer-h` tall. Below `md`, `scroll-padding-bottom` (`--bottom-bar-h` + 1rem, and + `--wizard-footer-h` on a page with the wizard's footer) keeps keyboard focus clear of the bottom nav and the footer (WCAG 2.4.11; Chrome's Tab scrolling honours it). Below 360px the product name is visually hidden (the accessible name stays) and it never wraps (`whitespace-nowrap`). Print: the headers are `print:static`, the bottom nav `print:hidden`. E2E in `tests/e2e/billabong.spec.ts` "bottom bars on a phone" (375 × 700): the wizard footer's bottom is at or above the nav's top; tabbing through `/programs/` never focuses anything overlapping the bottom nav; tabbing through every wizard step never focuses a field overlapping the footer (step 2 failed before the fix). The home page's hero canvas shows an unpainted strip at its top in headless screenshots at 375 × 700 (not at 812, and still with the header removed): a screenshot artefact of the contour canvas, unrelated to the bars.
- **Task 4 (window, highlight, tabs, pills).** `components/ui/window.tsx`: `Window({ title, as = 'h2' | 'h3', actions, className, bodyClassName, children })`, a `section` named by its title heading (`aria-labelledby` from `useId`) with a `--neutral-bg` title bar, the caller's `actions`, then the minimise, maximise and close glyphs in one `aria-hidden` span with nothing focusable; the body is `--surface`, `p-4 md:p-6`. It is not a client component: React 19 allows `useId` in Server Components, so the server pages that will use it (program detail, the 404) render it as HTML and ship no JavaScript for it; a throwaway build with two windows on the 404 gave distinct server ids (`_S_3_`, `_S_4_`). `components/ui/highlight.tsx`: `Highlight({ tone = 'amber' | 'sage' | 'sky', children })`, a `<mark>` with the `highlight` utility, `text-fg` and `[--hl:var(--hl-<tone>)]`; it takes no `className`, so nothing can give it muted text. The `highlight` utility paints `color-mix(in srgb, var(--hl, var(--hl-amber)) 35%, transparent)` only inside `@supports (color: color-mix(in srgb, red, red))`: the minifier gives an unguarded `color-mix()` a fallback at the first colour's full strength (as `glow-brand` shows in the built CSS), and `--fg` on a full-strength highlight is under 2:1 in dark. The built CSS has the base rule (no background), the `@supports` band and a forced-colours rule (`Mark`, `MarkText`), and no fallback. The `--color-hl-*` theme entries are gone, so there are no `bg-hl-*` utilities whose `/35` modifier would have the same fallback. Tests: `tests/components/window.test.tsx`, `tests/components/highlight.test.tsx` (including scans of `app/` and `components/` for a raw `<mark>` or the bare utility, and for muted text inside a `Highlight`), `tests/lib/tokens.test.ts` (the utility's 35% equals `HIGHLIGHT_ALPHA * 100`, the band only inside `@supports`, forced colours, no hl theme colours), and `tests/e2e/billabong.spec.ts` "marker highlight" (reads the served style sheets: every `.highlight` background is the guarded `color-mix()` or `Mark`; a mark computes to the tone at alpha 0.35 behind `--fg`, light and dark). Tabs: the indicator is 3px (`h-[3px]`) of `--accent`, as in the top bar. Pills: `Badge` is `rounded-full` with a `--border-strong` outline (the unused `subtle` variant is `--neutral-bg`); `StatusPill`'s `neutral` tone (paused, closed) gained a `--border-strong` outline, so it keeps an edge on a neutral title bar; `ok` and `warn` keep a transparent one; colours unchanged. Task 3 leftovers: the wizard's phone footer is `min-h-(--wizard-footer-h)`, so with enlarged text it grows upwards instead of under the bottom nav (at 200% text the buttons end 25px above the nav), and the wizard tab-through e2e also counts focus overlapping the bottom nav. Home first-load JS 279,803 bytes gzipped.
- **Builds need network access**: `next/font` downloads Rubik from Google at build time (the deployed site makes no request to Google).
