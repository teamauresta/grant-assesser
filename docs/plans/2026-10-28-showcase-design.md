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

- **Assess:** a results card listing the four groups, each with a bar that fills in (no counts: real counts depend on the visitor's answers, so any number would be invented).
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

## 8. What changed during the build

Built on `feature/showcase` on 28 Oct 2026. Where the build differs from sections 1–7:

**Hero aurora (§2)**

- **Pause button.** It keeps one name, "Pause background animation", and reports its state with `aria-pressed`, instead of switching between "Pause" and "Play" names (a name that changes with the state contradicts the pressed state for screen readers). The icon still swaps. It comes after the hero's content in the DOM, so it follows the headline and links in reading and tab order, and it sits outside the keyed canvas so a remount keeps it and its focus.
- **Strength.** One cap became a value per theme: `AURORA_ALPHA` is 0.30 in light and 0.24 in dark (`lib/aurora.ts`), each checked in `tests/lib/tokens.test.ts`. The no-WebGL gradient is one layer at no more than 14%, under both.
- **Full bleed.** The field spans the viewport (`w-screen`, centred on the hero) rather than the 1120px column. `100vw` includes a classic scrollbar, so `body:has([data-hero-aurora]) { overflow-x: clip }` clips the overhang, on the home page only.
- **Code split and leak check.** `lib/aurora.ts` (strength and the `gn-aurora` pause preference) is in the first load because the pause button needs it before the shader arrives; `lib/aurora-shader.ts` (GLSL, colour reading, flow clock) is imported only by the lazy `aurora-canvas.tsx`. `scripts/js-size.mjs` fails if `gl_FragColor` (`LAZY_ONLY`) appears in a first-load chunk. The lazy chunk is about 3KB gzipped, not 5KB.
- **Colours.** `hexToRgb` accepts `#rgb` as well as `#rrggbb` (the CSS minifier shortens `#ffffff` to `#fff`), and `readAuroraColours` normalises every token through a 2D context's `fillStyle`, so a colour the minifier rewrote in another form still reads.
- **Clock.** The shader gets `auroraFlow(t) = FLOW_MAX · sin(t · 0.06 / FLOW_MAX)` (`FLOW_MAX` 16) instead of raw seconds, so the value stays small for 16-bit floats on `mediump` GPUs; the field slows, turns and drifts back about every 14 minutes rather than stepping. The first frame (and the only one under reduced motion) is 12 seconds in.
- **Resolution.** Device pixel ratio capped at 1.5, then halved: at most 0.75 canvas pixels per CSS pixel.
- **Lost WebGL context.** Not in the design. iOS drops contexts in background tabs, so a loss remounts a fresh canvas, waiting until the tab is visible again. Only a loss within 30 seconds of a fresh canvas, with the tab in view all that time, is treated as a failing GPU and settles for the still gradient.
- **Headline.** `rise` is 600ms, longer than the 150–300ms rule in `CLAUDE.md`; it runs once on load and is recorded there as an exception. The second line uses `animate-rise-late`, which carries its 80ms delay in the animation shorthand: a separate `animation-delay` utility landed before the shorthand in the built CSS and was reset to 0 (an e2e test checks the computed delays).
- **Gradient phrase on the aurora.** Each `--lift-*` stop keeps 3:1 (large text) over the strongest aurora blend in its theme (lowest: 3.25 for light `--lift-2`), checked in `tests/lib/tokens.test.ts`.

**Sorting story (§3)**

- **Measured pile instead of seeded offsets.** `chipScatter(slug)` now gives only a tilt (up to 6 degrees, halved from 12 so tilted chips do not reach into the next row) and a start delay. Where each chip lies unsorted is measured from the real layout. When pinned, `pileLayout` deals the chips, in a seeded order, into rows across the stage under the headings: as many columns as fit a median chip plus a 56px gap (4 at 1280px, 3 at 800px), one more when the pile is short and there is room across; each row's spare width is split into uneven seeded gaps, and each chip sits high or low in its row only as far as its tilt allows. No chip covers more than 15% of another (`tests/lib/showcase.test.ts`); measured on screen, overlapping pairs went from 22 (worst 60%) to 0 at 1280×800 and from 31 (worst 57%) to 5 (worst 1%) at 800×800. When settling (phones), `cloudSlots` jumbles each chip within its own list (2 columns) and `scatterOffset` turns a slot into a pixel offset. The pile is measured again on resize and when fonts finish loading.
- **Pins only where it fits.** The section pins only on screens at least 48rem wide and 36rem tall, with motion allowed (the `pin` variant in `app/globals.css`, matched by `PIN_QUERY` in the component); below 50rem tall (`pin-short`) it has a one-line heading, smaller gaps and 22px chips, so the whole block, call to action included, stays on screen while it sorts (checked at 1280×720, 1366×650 and 1024×640). Shorter windows settle once, like phones. If the story fails to load there is no pinned scroll range.
- **Counts tick up.** Each column's visible count starts at 0 and ticks up as its chips land, instead of fading in: text must never be transparent (axe reads it as a contrast failure). The visible count is `aria-hidden`; a hidden "(N)" gives screen readers the real total from the start.
- **Hand-written scroll progress.** `pinProgress(top, height, viewport)` in `lib/showcase.ts`, read from `getBoundingClientRect()` on scroll and resize at most once a frame, instead of `motion`'s `useScroll`. A reload part-way down starts at the right place. Every chip has landed at `SORT_END` (0.8 of the pinned range); the rest holds the result.
- **Phone settle trigger.** The settle starts when the stage's top passes 70% of the way down the screen (`rootMargin: 0px 0px -30% 0px`), not at a share of the stage in view, which a stage taller than the screen could never reach. It runs once per visit (1.2s, linear, each chip's own stagger and ease-out shape it); later changes show the result sorted. `tween()` gained an optional `ease` for this.
- **Keyboard.** A focused chip shows the whole stage sorted (CSS `:focus-within`, and the counts follow), so a keyboard user never tabs through a pile.
- **Loading the checks.** `lib/showcase.ts` (layout maths, in the first load) must not import the checks. `DEMO_PROFILE` and `sortStory()` live in `lib/showcase-story.ts`, loaded with `import()` once `now` is known (about 5KB gzipped). The group ids, order and labels moved to `lib/groups.ts`, re-exported by `lib/assess.ts` and `lib/assessment/results.ts`, so the stage headings do not pull in the checks. `keepStory` keeps the same story when `useNow()`'s minute tick sorts everything the same way, so the section never restarts.
- **Reserved height and failure.** Below 768px the empty stage reserves a height stepped by width (within about 60px of the filled stage, 320–767px); wider screens reserve 28rem. If the story module fails to load (a redeploy can remove the chunk), the stage drops the reserved height and says "The example could not load. Browse all programs instead."; each minute tick retries. Without JavaScript a `noscript` line says the same.
- **Caption.** "checked today against every program", followed by how many closed programs are left out.

**Spotlight (§5)**

- The highlight is a radial gradient of plain `--fg`, with its strength as the layer's opacity (`--spot-mix`), not a `color-mix()`: the minifier's fallback for `color-mix()` would paint full `--fg` under the text in older browsers.
- Strength per theme: 6% in light, 4% in dark (light text on a dark ground shows the same highlight more strongly). Both are in the contrast tests.
- Size per use with `--spot-size`: 240px by default, 200px on persona cards, 72px on the type links.

**Previews (§4)**

- Built as `components/home/previews.tsx`, with `data-play` (`ready` holds the start state, `run` plays) and `data-anim` (grow, slide, pop, fade) parts; CSS in `app/globals.css`. Like `<Reveal>`, the start state is held only after hydration, only below the first screen and only with motion allowed; the exported HTML and print show the end state. They play when half in view. Every part ends within 1.5 seconds (a component test adds each delay to its duration).
- Extras beyond §4: the plan card has a second, faded row and the report page has a logo mark, a title line and two summary blocks. The plan's second row and the report's summary blocks show from 768px up only (on phones the report page runs off the card before them, so they would animate unseen).
- No counts on the Assess preview (see §4).
- Frames have a minimum height, not a fixed one (`min-h-32`, `md:min-h-44`), so they grow with large text, and they are shorter on phones.
- The global reduced-motion rule now zeroes `animation-delay` as well as durations, so a preview already holding its start state when reduced motion is switched on does not wait out its delays.

**Testing (§7)**

- `data-frame` updates every 30 frames (about twice a second), not once a second.
- `tests/e2e/showcase.spec.ts`: the aurora plays, pauses and remembers the pause across a reload; under reduced motion it draws one still frame and offers no button; the sorting story sorts every chip at the end of the pinned scroll (desktop), settles once in view (phone), is sorted without scrolling under reduced motion, and shows sorted when a chip has focus, with Enter opening the program; the previews play once when scrolled to and then rest; persona cards have one border colour on every side. `liftoff.spec.ts` now covers the hero numbers, the type links and celebrations. `screens.spec.ts` adds viewport shots of the story at 1280px (hero, sort at its start, part-way and end, How it works) and the phone settle part-way at 375px.
- Full-page captures of the home page are taken under reduced motion: with motion, the pinned sorting story draws flat (the unsorted pile, then a screen and a half of empty pinned range).

**Size (§7)**

- Home first-load JavaScript: 279,695 bytes gzipped on 29 Oct 2026 (279,175 on 28 Oct, before the measured pile), within the 297,083-byte budget (Liftoff measured about 278KB). The aurora (about 3KB) and the story's checks (about 5KB) load later with `import()`.
