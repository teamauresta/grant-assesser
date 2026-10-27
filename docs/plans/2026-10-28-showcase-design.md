# Showcase: a home page that shows the product

Date: 28 Oct 2026. Status: approved by the owner ("ye", option 1 as described).

After Liftoff shipped, the owner asked for two things: no more coloured strips anywhere on the site, and a home page animation worthy of an award, with a free hand on how. Liftoff's hero particles were generic and, to meet WCAG 2.2.2, settled after 5 seconds; the floating icon band was a stock effect; none of the motion said anything about the product.

Goal: every piece of motion on the home page demonstrates something real, the hero stays alive, and the site keeps its speed, accessibility and honesty.

## 1. Coloured strips

Removed everywhere they are decoration:

| Where | Now | After |
|---|---|---|
| Persona cards | 2px top edge in the persona's Liftoff stop | Neutral border, no edge |
| Report preview cover | 48px accent bar under the title | Removed |
| PDF report | Accent rule under the cover title and under every section heading | Neutral hairline (`C.hairline`) |

State indicators stay: the active top-nav underline, the active tab indicator, and the assessment and application progress bars. They tell people where they are, which is not decoration.

## 2. Hero: a living gradient with a pause button

- **Aurora.** A WebGL fragment shader (domain-warped noise, no library, about 5KB gzipped) draws a slow flowing field in the three Liftoff stops of the current theme. It sits mostly to the right and fades into the page background behind the text column (a mask, plus a capped strength). The pointer bends the flow gently, eased. It renders at reduced resolution (the field is soft anyway) with device pixel ratio capped at 1.5.
- **Loading.** Not in the server HTML or the first download: `HeroAurora` loads the shader component with `import()` after hydration and fades it in. Without WebGL it shows a still CSS gradient in the same stops.
- **Pause (WCAG 2.2.2).** The aurora moves for as long as the page is open, so it has a visible pause control: a 44×44px button in the hero's lower-right corner, `aria-pressed`, named "Pause background animation" or "Play background animation", Lucide `Pause`/`Play` at 16px. The choice is remembered per browser (`localStorage`, wrapped in try/catch). It also stops while the hero is off screen (`IntersectionObserver`) and while the tab is hidden.
- **Reduced motion.** One still frame of the shader (or the CSS gradient), no pointer response, no pause button (nothing moves).
- **Contrast.** The field's strength is capped by `AURORA_MAX_ALPHA`. A unit test blends each Liftoff stop over `--bg` at that strength, in both themes, and checks `--fg` and `--muted-fg` still meet 4.5:1 on the result, so text that lands on the field stays readable.
- **Theme changes.** The shader re-reads `--lift-*` and `--bg` when the theme changes (system setting or the in-app toggle).
- **Headline entrance.** The two lines of the headline rise into place once on load (CSS keyframes, about 600ms, staggered by 80ms, `motion-safe:` only). The keyframes end visible, so nothing depends on JavaScript.
- **Removed:** tsParticles (`@tsparticles/*`), `ParticleField`, `HeroParticles`, `StaticScatter`, `lib/hero-particles.ts`, `lib/particle-idle.ts`, the band's float keyframes and scroll drift.

## 3. "Watch 35 programs sort themselves"

A new section after the persona cards that demonstrates the assessment.

- **Real data.** `lib/showcase.ts` holds `DEMO_PROFILE`, a pre-raise AI startup in Victoria (fixed answers, labelled as an example), and `sortStory(programs, now)`, which runs the real `assessProgram()` checks and returns each program's group. Closed programs leave the stage and are counted in a note. Groups depend on `now`, so the stage fills in on the client (`useNow()`); the server HTML holds the heading, caption and a stage of fixed height, so nothing shifts.
- **Structure.** The final, sorted layout is the real DOM: four lists under headings (Act now, Prepare, Watch, Not a fit, each with its count), each item a chip with the program's name and a link to its page. Screen readers and keyboards get the sorted result. The scatter is only a transform: every chip has a seeded offset (`chipScatter(slug)`: distance, angle, rotation) from its final place.
- **Desktop (≥ 768px).** The section is about 250vh tall with a sticky stage of one screen. Scroll progress through it drives one CSS variable on the stage (`--sort`, written straight to the style, no React render per frame); each chip derives its own progress with a small stagger and moves from its offset to rest with an ease-out curve. Column counts fade in as their chips land. Scrolling drives it, so it is not automatic motion.
- **Phones.** No pinning: the chips settle once, over about 1.2 seconds, when the stage comes into view.
- **Reduced motion.** The sorted result, still.
- **Caption and call to action.** "Example: a pre-raise AI startup in Victoria, checked today against all 35 programs." Then "Run it for your company", linking to the assessment.

## 4. How it works: product previews

The dark panel stays. Each step gets a small preview built from page elements (no images), decorative and `aria-hidden`, which plays once when it scrolls into view (finite CSS animations, under 1.5 seconds):

- **Assess:** a results card whose four group labels fill in with counts.
- **Plan:** a pipeline card that slides from Preparing to Submitted, and a tick.
- **Report:** a PDF page whose lines draw in.

They use the panel tokens plus one new `--panel-surface` (card background on the panel), included in the contrast tests. The faint dash scatter behind the panel goes.

## 5. Cards and type links: a cursor highlight

- **Spotlight.** On devices with a fine pointer, a soft highlight follows the cursor across persona cards and the type links: a radial gradient at the pointer, at most 6% of `--fg` over `--surface`. One delegated `pointermove` listener per list writes `--spot-x`/`--spot-y` on the hovered card. Off under reduced motion and on touch. A unit test checks `--muted-fg` still meets 4.5:1 on the strongest highlight in both themes.
- **Persona cards** keep their coloured icon badges and the hover lift; the shadow glow in the persona's tone stays, the top edge goes.
- **Browse by type** becomes a plain row of links (icon circle and label) with the spotlight; no float, no drift.

## 6. Unchanged

In-app pages (programs, results, plan, report, settings) keep Liftoff's calm motion; they only lose the strips. Celebrations, toasts, count-ups and the progress ring are unchanged.

## 7. Accessibility, performance, testing

- **Motion rules.** The aurora is the only automatic motion that runs past 5 seconds, and it has the pause button. Everything else is finite or driven by scrolling or the pointer.
- **Bundle.** The shader component loads with `import()`. Removing tsParticles drops the lazy chunks. The home first-load JavaScript must stay within the 297,083-byte budget (`pnpm size`).
- **Unit tests.** `sortStory` groups for `DEMO_PROFILE` at `PERSONA_NOW` (with closed programs counted), `chipScatter` determinism and range, per-chip progress maths, aurora pause preference (storage failures ignored), aurora and spotlight contrast in both themes, `--panel-surface` contrast.
- **Component tests.** Pause button name, `aria-pressed` and persistence; reduced motion renders a still frame and no button; the WebGL fallback; the sort story renders four labelled lists once `now` is known, and an empty stage of fixed height before; persona cards have no top edge.
- **End-to-end.** The sort story reaches its sorted state at the end of its scroll (chips' transforms back to none); the pause button stops the aurora's frame counter (a `data-frame` attribute on the canvas, updated about once a second) and resumes it; axe on the home page in light and dark; review screenshots at 375px and 1280px, including mid-sort.
- **Docs.** `CLAUDE.md` (structure, motion rules, the strip rule), `README.md`, and this file.
- **Delivery.** Branch `feature/showcase`, built task by task with reviews, screenshots to the owner before merging.
