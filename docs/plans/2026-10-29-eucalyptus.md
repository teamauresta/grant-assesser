# Eucalyptus Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Liftoff teal → blue → violet gradient with the Eucalyptus look (sand paper, eucalyptus green, ochre spark) across the whole site, with no gradient text, and turn the hero aurora into living contour lines.

**Architecture:** Every colour on the site comes from tokens in `app/globals.css`, so the retheme is mostly token values plus a handful of brand pieces that referenced the `--lift-*` gradient. The hero keeps `HeroAurora` and `AuroraCanvas` (pause, visibility, context loss, reduced motion, lazy load); only the fragment shader, the colours it reads and the CSS fallback change.

**Tech Stack:** Next.js 16 static export, Tailwind CSS 4 tokens, WebGL 1 with `OES_standard_derivatives`, Vitest, Playwright + axe.

**Design:** `docs/plans/2026-10-29-eucalyptus-design.md`. Read `CLAUDE.md` first (conventions, design system, motion rules).

**Rules for every task:** TDD where there is logic. After each task `pnpm typecheck && pnpm lint && pnpm test` must pass. Never weaken an assertion to pass. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not commit `AGENTS.md` or `australian-ai-startup-funding-report.md`.

---

### Task 1: Eucalyptus tokens

**Files:**
- Modify: `app/globals.css` (the `:root`, `[data-theme="dark"]` and `@theme inline` blocks, and the header comment)
- Modify: `lib/celebrate.ts:13-17` (confetti colours)
- Modify: `lib/aurora.ts:8` (`AURORA_ALPHA`)
- Test: `tests/lib/tokens.test.ts`

**Step 1: Rewrite the token tests first**

In `tests/lib/tokens.test.ts`:
- Import `BRAND_COLOURS` instead of `LIFT_COLOURS`.
- Replace the `--lift-*` tests with:
  - `--brand`, `--brand-2`, `--spark` each meet 4.5:1 on `--bg` and on `--surface`.
  - Contour lines: `--fg`, `--muted-fg` and `--accent` each meet 4.5:1 on `mixHex(t['--bg'], t['--brand'], AURORA_ALPHA[theme])` (the strongest line). Comment: the hero paints `--brand` lines over `--bg` at most `AURORA_ALPHA` strong; the headline phrase is `--accent`.
  - Keep the spotlight test as is.
  - Panel: `--panel-fg`, `--panel-muted-fg`, `--panel-spark` meet 4.5:1 on `--panel-bg`; `--panel-fg`, `--panel-muted-fg` on `--panel-surface` (kept); accent focus ring 3:1 on the panel (kept).
  - Logo: `--on-logo` meets 3:1 on `--logo` (non-text graphic).
- Replace "the logo stops are the light Liftoff stops…" with: `light['--logo']` equals `light['--brand']`, and the dark block defines neither `--logo` nor `--on-logo`.
- Replace the confetti test: `BRAND_COLOURS` equals `[--brand, --brand-2, --spark]` of light then of dark (lower-cased).
- Add: no `--lift-` or `--panel-lift-` token remains: `expect(css).not.toMatch(/--(panel-)?lift-/)`.
- Add: the status tokens are unchanged (guard the "status pills keep their colours" decision): light `--ok-fg` `#166534`, `--warn-fg` `#92400e`, `--danger` `#b91c1c`; dark `--ok-fg` `#86efac`, `--warn-fg` `#fcd34d`, `--danger` `#f87171`.
- Add AA checks for the pairs the old file did not cover: `--fg` and `--muted-fg` on `--surface` and `--neutral-bg`; `--neutral-fg` on `--neutral-bg`; `--on-primary` on `--primary`; `--border-strong` 3:1 on `--bg` and `--surface`. (Check first whether another test already covers them, e.g. `grep -rn "on-primary" tests/lib`; do not duplicate.)

**Step 2: Run, expect failures**

Run: `pnpm vitest run tests/lib/tokens.test.ts`
Expected: FAIL (`BRAND_COLOURS` not exported, `--brand` undefined).

**Step 3: Change the tokens**

`:root` values (design §1):

```css
  --bg: #faf8f3;
  --surface: #f2eee4;
  --border: #e3ddd0;
  --border-strong: #8a8274;
  --fg: #1b1a16;
  --muted-fg: #5b564c;
  --primary: #1f5c4a;
  --on-primary: #ffffff;
  --accent: #1f5c4a;
  /* --danger, --scrim, --ok-*, --warn-* unchanged */
  --neutral-bg: #ece7dc;
  --neutral-fg: #45413a;

  /* Eucalyptus brand colours: brand moments only (logo, hero phrase and contour lines, progress ring,
   * persona tones, celebrations). Never for status or body text. */
  --brand: #1f5c4a;
  --brand-2: #3f6e5a;
  --spark: #a4531b;

  /* The logo: the light --brand in both themes, with a sand compass. Not redefined in the dark theme. */
  --logo: #1f5c4a;
  --on-logo: #faf8f3;

  /* The "How it works" panel is deep forest green in both themes. */
  --panel-bg: #12241d;
  --panel-fg: #f5f1e8;
  --panel-muted-fg: #b5bdb3;
  --panel-spark: #e0a060;
  --panel-surface: #1b3229;
  --panel-border: transparent;
```

`[data-theme="dark"]`:

```css
  --bg: #0e1311;
  --surface: #161d1a;
  --border: #25302b;
  --border-strong: #6f7b74;
  --fg: #f2efe6;
  --muted-fg: #a7ada5;
  --primary: #86c9a9;
  --on-primary: #0e1311;
  --accent: #86c9a9;
  /* --danger, --scrim, --ok-*, --warn-* unchanged */
  --neutral-bg: #25302b;
  --neutral-fg: #d6d9d2;

  --brand: #86c9a9;
  --brand-2: #9fd3b8;
  --spark: #e3a266;

  /* Keep: --spot-mix 4%, and --panel-border as a visible edge. Re-check it against the new
   * --panel-bg: if the panel no longer nearly matches --bg, keep the edge anyway (it is decorative). */
  --panel-border: #2c4a3d;
```

Remove `--lift-1..3`, `--logo-1..3`, `--on-lift`, `--panel-lift-1..3` everywhere. In `@theme inline` replace `--color-lift-*` with `--color-brand`, `--color-brand-2`, `--color-spark`, and add `--color-panel-spark`. Update the header comment: "The Eucalyptus brand colours (--brand, --brand-2, --spark) are for brand moments only…" and "The panel (--panel-*) is deep forest green in both themes."

Do NOT remove `text-lift`, `text-lift-panel` or `glow-lift` yet (Task 2 removes them with their users); point them at the new tokens so the build keeps working: `text-lift` → `color: var(--accent)` (no gradient), `text-lift-panel` → `color: var(--panel-spark)`, `glow-lift` → `box-shadow: 0 10px 30px -12px color-mix(in srgb, var(--brand) 55%, transparent)`.

`lib/celebrate.ts`:

```ts
/**
 * Confetti colours: the Eucalyptus brand colours of both themes (eucalyptus, sage, ochre, then the
 * lighter night versions). Hex values are fine here: canvas-confetti needs literal colours and this
 * is not component styling. Keep in step with app/globals.css.
 */
export const BRAND_COLOURS = ['#1f5c4a', '#3f6e5a', '#a4531b', '#86c9a9', '#9fd3b8', '#e3a266'];
```

and use `BRAND_COLOURS` where `LIFT_COLOURS` was used.

`lib/aurora.ts`: `export const AURORA_ALPHA = { light: 0.25, dark: 0.25 } as const;` and update its comment: "Strongest a contour line may paint over --bg, per theme."

At 0.25 the contrast is: light `--fg` 11.0, `--muted-fg` 4.61, `--accent` 4.94; dark 9.6, 4.83, 5.77. Do not raise it.

**Step 4: Fix every other reference so the build compiles**

`grep -rnE "lift-[123]|logo-[123]|on-lift|panel-lift|LIFT_COLOURS" app components lib tests`. For this task, only make the minimal substitutions that keep things compiling and passing, leaving the redesign of each piece to Task 2:
- `lib/personas.ts`: `PersonaTone = 'var(--brand)' | 'var(--brand-2)' | 'var(--spark)'`, tones in that order (bootstrapped, pre-raise, vc-backed); comment "An Eucalyptus brand colour…" → "A brand colour that colours a persona's card. Each meets AA on the page background."
- `app/page.tsx:17-19`: tints `text-brand`, `text-brand-2`, `text-spark`.
- `lib/aurora-shader.ts` `readAuroraColours`: temporarily read `['--brand', '--brand-2', '--spark']` as `stops` (Task 3 replaces this). Update `tests/lib/aurora-shader.test.ts` to set those properties.
- `components/home/hero-aurora.tsx` fallback: `--lift-2` → `--brand`, `--lift-3` → `--brand-2` (Task 3 replaces it).
- `components/plan/progress-ring.tsx`, `components/layout/logo-mark.tsx`: leave for Task 2, but swap the variable names so nothing points at a missing token: ring stops all `var(--brand)`; logo stops all `var(--logo)` and `--on-lift` → `--on-logo`. Update `tests/components/logo-mark.test.tsx` to expect `var(--logo)` and `var(--on-logo)`.

**Step 5: Run everything**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS. Then `grep -rnE "lift-[123]|logo-[123]|on-lift|panel-lift|LIFT_COLOURS" app components lib tests scripts` returns nothing.

**Step 6: Commit**

```bash
git add app/globals.css lib/celebrate.ts lib/aurora.ts lib/personas.ts lib/aurora-shader.ts app/page.tsx components tests
git commit -m "feat(theme): Eucalyptus tokens across the site"
```

---

### Task 2: Brand pieces without gradients

**Files:**
- Modify: `app/globals.css` (remove the `text-lift`, `text-lift-panel`, `glow-lift` utilities; add `glow-brand`)
- Modify: `components/home/hero.tsx:34,40`
- Modify: `components/home/how-it-works.tsx:26`
- Modify: `components/layout/logo-mark.tsx`, `app/icon.svg`
- Modify: `components/plan/progress-ring.tsx`
- Test: `tests/components/logo-mark.test.tsx`, `tests/components/progress-ring.test.tsx`, `tests/components/hero.test.tsx`, `tests/components/how-it-works.test.tsx`, `tests/e2e/showcase.spec.ts`

**Step 1: Failing tests**

- `logo-mark.test.tsx`: the mark has no `linearGradient`; the tile and centre dot fill `var(--logo)`; compass uses `var(--on-logo)`; no raw hex. (The duplicate-id check goes: there are no ids.)
- `progress-ring.test.tsx`: no `linearGradient`; the arc's stroke is `var(--brand)`.
- `hero.test.tsx`: the phrase "your startup qualifies for" has class `text-accent` and not `text-lift`; the primary link has `glow-brand`.
- `how-it-works.test.tsx`: each step number has `text-panel-spark`.
- A Vitest check that the gradient utilities are gone: in `tests/lib/tokens.test.ts`, `expect(css).not.toMatch(/@utility (text-lift|text-lift-panel|glow-lift)\b/)` and `expect(css).not.toMatch(/background-clip:\s*text/)`.
- `tests/e2e/showcase.spec.ts`: a new test, "no gradient text on the home page": on `/grant-assesser/`, evaluate every element and assert none has a computed `background-clip` or `-webkit-background-clip` of `text`. Keep it next to the "no coloured strip" test.

Run `pnpm vitest run tests/components tests/lib/tokens.test.ts`; expect failures.

**Step 2: Implement**

- `globals.css`: delete the three utilities. Add:

```css
/* A quiet eucalyptus shadow: the primary call to action in the hero. */
@utility glow-brand {
  box-shadow: 0 10px 30px -12px color-mix(in srgb, var(--brand) 55%, transparent);
}
```

- `hero.tsx`: phrase `className="block text-accent motion-safe:animate-rise-late"`; button `glow-brand`.
- `how-it-works.tsx`: number `className="num self-start font-mono text-5xl font-semibold text-panel-spark"`. Update the component comment "Dark in both themes" → "Deep forest green in both themes".
- `logo-mark.tsx`:

```tsx
/**
 * The compass-and-rising-needle mark: a eucalyptus tile with a sand compass. Decorative: the brand
 * name sits beside it. Same geometry as app/icon.svg. It uses --logo (the light --brand) in both
 * themes so the compass (--on-logo) keeps 3:1.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={cn('size-7 shrink-0', className)}>
      <rect width="32" height="32" rx="7" fill="var(--logo)" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="var(--on-logo)" strokeWidth="1.75" />
      <path d="M20.6 11.4 L17.6 17.6 L11.4 20.6 L14.4 14.4 Z" fill="var(--on-logo)" />
      <circle cx="16" cy="16" r="1.1" fill="var(--logo)" />
    </svg>
  );
}
```

Drop the `useId` import.
- `app/icon.svg`: same geometry, `fill="#1F5C4A"` for tile and dot, `#FAF8F3` for the compass, no gradient.
- `progress-ring.tsx`: remove `<defs>`/`useId`; arc `stroke="var(--brand)"`; comment "A ring in eucalyptus."

**Step 3: Run**

`pnpm typecheck && pnpm lint && pnpm test` PASS; `grep -rn "text-lift\|glow-lift" app components` empty.

**Step 4: Commit**

```bash
git commit -am "feat(theme): solid eucalyptus logo, ring, headline phrase and step numbers"
```

---

### Task 3: Contour lines in the hero

**Files:**
- Modify: `lib/aurora-shader.ts` (`readAuroraColours`, `AURORA_FRAGMENT`, comments)
- Modify: `components/home/aurora-canvas.tsx` (derivatives extension, `uLine` uniform, `SCALE`)
- Modify: `components/home/hero-aurora.tsx` (`AuroraFallback`, comments)
- Test: `tests/lib/aurora-shader.test.ts`, `tests/components/hero-aurora.test.tsx`

**Step 1: Failing tests**

`tests/lib/aurora-shader.test.ts`:
- `readAuroraColours` sets `--bg: white`, `--brand: teal` and returns `{ bg: [1,1,1], line: [0, 128/255, 128/255], alpha: AURORA_ALPHA.dark }` (keep the fillStyle stand-in).
- The fragment shader draws contours: it contains `#extension GL_OES_standard_derivatives : enable`, `fwidth(`, `uniform vec3 uLine;`, and no `uC1`/`uC2`/`uC3`.
- Keep the `auroraFlow` tests unchanged.

`tests/components/hero-aurora.test.tsx`, the "without WebGL" test: the fallback element's class contains `repeating-radial-gradient` and `var(--brand)`.

Run `pnpm vitest run tests/lib/aurora-shader.test.ts tests/components/hero-aurora.test.tsx`; expect failures.

**Step 2: `readAuroraColours`**

```ts
export type AuroraColours = { bg: number[]; line: number[]; alpha: number };

/** The current theme's colours, read from the CSS tokens (the theme lives on <html data-theme>). */
export function readAuroraColours(): AuroraColours {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const read = (name: string) => hexToRgb(normalise(style.getPropertyValue(name)));
  return {
    bg: read('--bg'),
    line: read('--brand'),
    alpha: AURORA_ALPHA[root.dataset.theme === 'dark' ? 'dark' : 'light'],
  };
}
```

Update the module comment: "The hero's WebGL side: the contour shader, the flow clock and the theme colours as uniforms."

**Step 3: The contour shader**

Replace `AURORA_FRAGMENT` (keep `AURORA_VERTEX`, `hexToRgb`, `normalise`, `auroraFlow`, `FLOW_MAX`, `FLOW_SPEED`):

```ts
/**
 * Topographic contour lines over a slowly drifting height field (domain-warped value noise). Lines
 * are about one canvas pixel wide whatever the slope (fwidth, from OES_standard_derivatives), every
 * fifth one stronger like an index contour on a survey map. The pointer raises a soft hill, so lines
 * bend around it. Strongest to the right (the text column is on the left) and fading out at the top
 * and bottom so the hero has no visible edge. Output never paints more than uAlpha of uLine over uBg
 * (the dither is under half a level). highp where the GPU has it: the sin() hash breaks into blocks
 * at 16-bit precision on phones.
 */
export const AURORA_FRAGMENT = `
#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uFlow;
uniform vec2 uPointer;
uniform vec3 uBg;
uniform vec3 uLine;
uniform float uAlpha;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 turn = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = turn * p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * 1.4;
  float t = uFlow;

  // Terrain: gentle warping keeps the lines flowing, never noisy.
  vec2 w = vec2(fbm(p + vec2(0.0, t * 0.4)), fbm(p + vec2(5.2, 1.3) - t * 0.35));
  float h = fbm(p + 1.2 * w + vec2(t * 0.15, 0.0));

  // The pointer raises a soft hill.
  vec2 d = (uv - uPointer) * vec2(aspect, 1.0);
  h += 0.12 * exp(-dot(d, d) * 9.0);

  // Contours: distance to the nearest level, in pixels.
  float v = h * 16.0;
  float f = fract(v);
  float px = min(f, 1.0 - f) / max(fwidth(v), 1e-4);
  float index = 1.0 - step(0.5, abs(mod(floor(v + 0.5), 5.0)));
  float line = (1.0 - smoothstep(0.4, 1.3, px)) * mix(0.5, 1.0, index);

  // Strongest on the right, fading behind the text column and at the top and bottom.
  float mass = smoothstep(0.25, 0.75, uv.x + 0.15 * (w.x - 0.5));
  float strength = mix(0.2, 1.0, mass) * smoothstep(0.0, 0.25, uv.y) * smoothstep(1.0, 0.8, uv.y);

  float a = uAlpha * clamp(line * strength, 0.0, 1.0);
  vec3 dither = vec3((hash(gl_FragCoord.xy + fract(uFlow * 50.0)) - 0.5) / 255.0);
  gl_FragColor = vec4(mix(uBg, uLine, a) + dither, 1.0);
}
`;
```

**Step 4: The canvas**

In `components/home/aurora-canvas.tsx`:
- Right after `getContext('webgl', …)`, require the extension before linking: `const derivatives = gl?.getExtension('OES_standard_derivatives');` and treat a missing one like no WebGL (`if (!canvas || !gl || !derivatives || !program) { onUnsupported(); return; }`; link only when the extension is there).
- `setColours`: `gl.uniform3fv(u('uLine'), line)` instead of the three stops.
- `SCALE`: lines need sharper pixels than the soft field did. Set `const SCALE = 0.75;` and update the comment: "device pixel ratio capped at 1.5, times 0.75, so never more than about 1.1 canvas pixels per CSS pixel; lines stay crisp on retina and the cost stays low."
- Rename the component comment "Draws the hero aurora" → "Draws the hero's contour lines"; keep the file and component names (the pause key, tests and size check refer to them).

**Step 5: The fallback**

`AuroraFallback` in `hero-aurora.tsx`:

```tsx
/**
 * Without WebGL: still contour rings in --brand, centred to the right, masked at the top, bottom and
 * left like the shader. One line colour at 18%, under both themes' AURORA_ALPHA.
 */
function AuroraFallback() {
  return (
    <div
      data-aurora-fallback
      className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_78%_45%,transparent_0_26px,color-mix(in_srgb,var(--brand)_18%,transparent)_26px_27px)] [mask-image:linear-gradient(to_right,transparent_30%,black_70%)]"
    />
  );
}
```

Keep the top/bottom fade: if one mask cannot do both, wrap in a parent with the vertical mask (`[mask-image:linear-gradient(to_bottom,transparent,black_20%,black_70%,transparent)]`) and put the horizontal mask on the child. Update the `HeroAurora` comment: "without WebGL it shows still contour rings".

**Step 6: Run and look**

`pnpm typecheck && pnpm lint && pnpm test`, then `pnpm build && pnpm size` (the size check must pass, and the shader must stay in the lazy chunk; `scripts/js-size.mjs` looks for `gl_FragColor`). Then `pnpm e2e tests/e2e/showcase.spec.ts` (pause, still frame, frame counter). Take screenshots of the hero in light and dark at 1280×800 and at 375×812 (`SCREENS=1 pnpm e2e tests/e2e/screens.spec.ts`), and look at them: lines visible but quiet, crisp, stronger to the right, the text column clean. Adjust only the shader's shape constants (scale 1.4, 16 levels, mass, strength) if needed; never `AURORA_ALPHA` upwards.

**Step 7: Commit**

```bash
git commit -am "feat(home): contour lines replace the aurora's flowing colour"
```

---

### Task 4: Docs, full checks and review screenshots

**Files:**
- Modify: `CLAUDE.md` (Design system, Motion, Structure lines that mention Liftoff, the gradient, `--lift-*`, `--logo-*`, `text-lift`, `glow-lift`, the aurora's colours, the panel being dark; the size figure)
- Modify: `README.md` (any Liftoff colour wording)
- Modify: `docs/plans/2026-10-29-eucalyptus-design.md` (add "§6 What changed during the build"; correct §1: the Verified badge stays `--primary`, the ochre is used for the panel numbers, the Private icon tint and the VC-backed persona)

**Steps:**
1. `grep -rn "Liftoff\|lift-\|text-lift\|glow-lift\|violet\|aurora" CLAUDE.md README.md` and update each to Eucalyptus wording. In Design system: "Minimal style: Geist fonts, warm sand surfaces, one eucalyptus accent, plus the brand colours (`--brand`, `--brand-2`, `--spark`; `LogoMark`; the hero contour lines) for brand moments only, never for status or body text. No gradient text. The logo uses `--logo` (the light `--brand`) in both themes with a sand compass (`--on-logo`). The How it works panel is deep forest green in both themes…".
2. Run `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e`, all pass. `pnpm build && pnpm size`: record the new home first-load figure in `CLAUDE.md`.
3. `SCREENS=1 pnpm e2e tests/e2e/screens.spec.ts` and view every screenshot in `test-results/screens/` (home, plan, results, light and dark, desktop and mobile). Look for: any leftover blue or violet, cool greys that clash with sand, the forest panel, status pills next to eucalyptus, the progress ring, the logo.
4. Commit: `docs: Eucalyptus in CLAUDE.md, README and the design`.
