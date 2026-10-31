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
- **Builds need network access**: `next/font` downloads Rubik from Google at build time (the deployed site makes no request to Google).
