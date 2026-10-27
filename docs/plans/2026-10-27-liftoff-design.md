# Liftoff: brand, motion and encouragement

Date: 27 Oct 2026. Status: approved by the owner, section by section.

The first release of Grant Navigator follows a modern-minimal system. The owner found it "almost too plain" and pointed to https://antigravity.google/ as the reference. Antigravity's energy comes from four things: a field of drifting, cursor-reactive particles in a blue-to-violet gradient; very large, tightly tracked headlines; one dramatic dark panel on a white page; and a band of floating icon circles that moves with scroll.

Goal: add that energy so the site encourages founders, without losing speed, accessibility or honesty.

Chosen approach: animation libraries. `motion` 14.6 (through `LazyMotion` with `domAnimation`), `@tsparticles/react` + `@tsparticles/slim` 4.5 for the hero, `canvas-confetti` 1.9.4 for celebrations.

## 1. Brand and visual system

**Liftoff gradient.** Three stops, light / dark:

| Stop | Light | Dark |
|---|---|---|
| `--lift-1` teal | `#0F766E` | `#2DD4BF` |
| `--lift-2` blue | `#2563EB` | `#60A5FA` |
| `--lift-3` violet | `#7C3AED` | `#A78BFA` |

Every stop meets WCAG AA (4.5:1) on `--bg` in its theme, so the gradient may be used for text. It is for brand moments only: the logo mark, one highlighted phrase in the home headline, hero particles, the progress ring, celebration bursts and the glow on primary calls to action. It is never used for status (status colours stay in `StatusPill`) and never for body text.

**Logo mark.** A gradient-filled compass with a rising needle, used in the top bar, mobile header and `app/icon.svg`.

**Headlines.** The home headline is `clamp(2.5rem, 7vw, 5rem)` with `-0.04em` tracking; one phrase carries the gradient. In-app page titles grow slightly and stay calm.

**Persona cards.** Each persona owns one stop: Bootstrapped teal, Pre-raise blue, VC-backed violet. It shows as an icon badge, a thin top edge and a soft hover glow.

**Dark feature panel.** A rounded panel that is dark in both themes, explaining "How it works" in three steps (Assess, Plan, Report) with large gradient numerals and faint drifting particles. Its own tokens (`--panel-bg`, `--panel-fg`, `--panel-muted-fg`) meet AA.

**Rule change.** "One accent" becomes "one accent, plus the Liftoff gradient for brand moments only".

## 2. Home hero

- **Particle field** (`tsParticles`, slim bundle) behind the hero: short dashes in the gradient stops, denser to the right, slow drift, gentle repulse near the cursor. About 120 particles on desktop, 50 on phones; no touch interaction. Client only, loaded with `import()` after hydration, fades in, pauses off screen and in background tabs, `aria-hidden`. With reduced motion a static SVG scatter of dashes replaces it.
- **Hero content:** an announcement pill ("Verified · 35 programs checked 26 Oct 2026", date from the newest `verification.lastVerified`, linking to `/programs/`); the headline with its gradient phrase; one line of subheading; "Start free assessment" (primary, gradient glow) and "Browse programs" (secondary).
- **Stats that count up:** total programs, open now, closing in the next 30 days. The last two depend on `now`, so they render after mount (the static HTML never bakes in "now"). No "$X available" total: summing programs would overstate what any founder can get.
- **Floating category band:** circles with Lucide icons for each program type, drifting in a gentle wave with slight scroll parallax. Each is a real link to `/programs/?type=<type>` with a visible label on hover and focus. Still with reduced motion.
- **Order below the hero:** persona cards, dark "How it works" panel, closing soon, trust row.

## 3. Motion across the app

Shared components in `components/motion/`:

- `MotionProvider`: `LazyMotion features={domAnimation} strict` plus `MotionConfig reducedMotion="user"`, mounted once in the root layout.
- `Reveal`: fade and 12px lift when entering the viewport, once, 300ms ease-out; children can stagger by 40ms. Content is never hidden in the exported HTML: only elements below the first screen animate, and only after hydration.
- `CountUp`: tweens a number from 0 with tabular figures. The final value is rendered in the HTML, so nothing flashes.
- Durations 150–300ms; ease-out to enter; exits about two thirds of the entrance; no more than one or two moving things at a time.

| Where | Motion |
|---|---|
| Everywhere | Route content fades in (no slide). Cards lift 2px on hover; buttons scale to 0.98 when pressed. Dialogs scale and fade from 0.96. |
| Programs | Cards reveal with stagger; filter changes animate cards out and reflow the rest. |
| Results | Groups reveal in sequence; score bars fill; the funding estimate counts up. |
| My Plan | A card moved between pipeline columns glides there (shared layout); the active tab indicator slides. |
| Report | Preview sections fade as they are toggled. |

## 4. Celebrations and encouragement

- `celebrate(kind)` in `lib/celebrate.ts` loads `canvas-confetti` on first use and fires in the gradient stops. It does nothing when the user prefers reduced motion or has turned off the new **Celebrations** setting (`settings.celebrations`, default `true`; older workspaces and imports without it still parse).
- Moments, each firing once per event:

| Moment | Burst | Message |
|---|---|---|
| Assessment finished, Results first shown | Medium, behind the counting funding estimate | Persona-specific, e.g. "4 programs you can act on now. Start with the one closing first." |
| Application moved to Submitted | Small, from the card | "Submitted. That's the hardest part done." |
| Application moved to Awarded | Large, from both sides | "Awarded. Add the reporting dates to your calendar." |
| Every goal for an application done | Small, on the goal list | "All steps done for <program>." |

- No celebration for Declined, Withdrawn or Not a fit. Declined shows a supportive toast: "Most funded startups applied more than once. See what else fits."
- Messages use a new `Toast` in `components/ui/` (`aria-live="polite"`, no focus steal, 4s auto-dismiss).
- **Progress ring** in the My Plan header: gradient stroke, share of goal steps done across open applications, counting up, with "5 of 12 steps done. Next: <goal>, due <date>." Returning users see a compact "Pick up where you left off" card under the hero buttons on the home page.
- **Encouraging empty states**, plain and specific, no hype and no emoji. Example for an empty pipeline: "Every funded startup started with one application. Add your first from your results."

## 5. Accessibility, performance, testing

- **Contrast:** a unit test computes contrast for every gradient stop and every panel text token in both themes.
- **Decorative layers** (particles, confetti canvas, band animation, ring artwork) are `aria-hidden`; the ring's number is real text.
- **Reduced motion** turns off particles (static image), band movement, count-ups (final value at once), reveals, layout animation and confetti. The existing global CSS rule already zeroes CSS transitions.
- **Keyboard:** the floating icons are links with the focus ring.
- **Performance:** `tsParticles` and `canvas-confetti` are dynamic imports only; `motion` uses `LazyMotion`. Budget: the home route's first-load JavaScript grows by at most 40KB gzipped, measured before and after. The particle canvas pauses off screen.
- **Tests:** Vitest for `celebrate()` gating and once-per-event, progress and next-due selectors, the `celebrations` schema default and old imports, `Toast` announcement, `CountUp` final value in markup, and gradient contrast. Playwright: journey under forced reduced motion, Awarded toast, axe on home including the dark panel in light and dark, hero screenshots at 375px and 1280px for review (not stored baselines).
- **Docs:** this file, plus `CLAUDE.md` design-system rules for the gradient, motion and celebrations.
- **Delivery:** branch `feature/liftoff`, subagent-driven build with reviews, screenshots to the owner before merging.
