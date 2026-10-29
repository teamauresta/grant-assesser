# Eucalyptus: a warmer, Australian look

Date: 29 Oct 2026. Status: approved by the owner (Eucalyptus direction, whole site, living contour hero, sections 3 and 4 as described).

After Showcase went live the owner said they were "not a big fan of gradient pink/purple tone": the Liftoff gradient (teal → blue → violet) in the hero aurora, the headline phrase, the logo, the progress ring and the How it works numbers. They chose Eucalyptus from four directions (Eucalyptus, editorial mono, bold ink, cool aurora), for the whole site rather than brand moments only.

Goal: one warm, distinctly Australian look across every page, with no gradient text, while keeping the motion, accessibility and speed Showcase delivered.

## 1. Palette

All text and background pairs meet WCAG AA; the numbers below are contrast ratios checked before approval.

| Token | Light | Dark ("night bush") | Use |
|---|---|---|---|
| `--bg` | `#faf8f3` sand paper | `#0e1311` | page |
| `--surface` | `#f2eee4` | `#161d1a` | cards, inputs |
| `--border` | `#e3ddd0` | `#25302b` | decorative separation |
| `--border-strong` | `#8a8274` (3.58 / 3.28 on surface) | `#6f7b74` (4.25 / 3.89) | form controls, outline pills |
| `--fg` | `#1b1a16` (16.4) | `#f2efe6` (16.3) | text |
| `--muted-fg` | `#5b564c` (6.9 / 6.3) | `#a7ada5` (8.2 / 7.5) | secondary text |
| `--primary` / `--on-primary` | `#1f5c4a` / `#ffffff` (7.8) | `#86c9a9` / `#0e1311` (9.8) | primary button |
| `--accent` | `#1f5c4a` (7.4) | `#86c9a9` (9.8) | links, focus ring, the hero phrase |
| `--neutral-bg` / `--neutral-fg` | `#ece7dc` / `#45413a` (8.2) | `#25302b` / `#d6d9d2` (9.6) | neutral pills |

Brand colours replace the `--lift-*` gradient stops:

| Token | Light | Dark | Use |
|---|---|---|---|
| `--brand` | `#1f5c4a` eucalyptus | `#86c9a9` | logo tile, progress ring, contour lines, persona tone |
| `--brand-2` | `#3f6e5a` sage (5.5) | `#9fd3b8` (11.2) | persona tone, icon tint |
| `--spark` | `#a4531b` ochre (5.2) | `#e3a266` (8.6) | small touches only: the Verified tick, an icon tint, a persona tone |

The logo uses the light `--brand` in both themes (`--logo`), with a sand compass (`--on-logo: #faf8f3`), so the mark looks the same everywhere.

The How it works panel becomes deep forest green in both themes: `--panel-bg #12241d`, `--panel-fg #f5f1e8` (14.4), `--panel-muted-fg #b5bdb3` (8.4; 7.1 on the surface), `--panel-surface #1b3229`, numbers in `--panel-spark #e0a060` (7.2).

The status colours (`--ok-*`, `--warn-*`, `--danger`) keep their values. OK green (`#166534`) is near eucalyptus; pills carry a tinted background and a label, so they stay distinct.

Geist stays the typeface.

## 2. No gradient text

- "your startup qualifies for" is solid `--accent`.
- The How it works numbers are solid `--panel-spark`.
- `text-lift`, `text-lift-panel` and `glow-lift` are removed. The hero's primary button gets a quiet shadow in `--brand` instead of the blue glow.
- The progress ring and the logo are solid `--brand`; `app/icon.svg` matches.
- Persona tones: `--brand`, `--brand-2`, `--spark`. The Verified / Honest / Private icon tints use the same three.
- Confetti colours: eucalyptus, sage, ochre and sand in both themes.

## 3. Hero: living contour lines

The aurora's engine stays; its drawing changes.

- **Shader.** A slowly drifting height field (smooth noise on the existing flow clock) drawn as topographic contour lines: thin, anti-aliased, every fifth line stronger like an index contour on a survey map. Lines are `--brand` over `--bg`. The field sits mostly to the right and fades behind the text column, as now.
- **Pointer.** The cursor raises a soft hill in the height field, eased, so lines bend around it. Idle behaviour as now.
- **Contrast.** Line strength is capped (`AURORA_ALPHA` per theme, renamed in meaning only if needed). The token test blends `--brand` over `--bg` at the cap and checks `--fg`, `--muted-fg` and `--accent` keep 4.5:1, in both themes.
- **Unchanged.** Lazy `import()`, the pause button (one name, `aria-pressed`, remembered in `gn-aurora`), off-screen and hidden-tab stop, context-loss remount, the still frame under reduced motion, the `LAZY_ONLY` size check.
- **Fallback.** Without WebGL, a still contour pattern in CSS (repeating radial gradients in `--brand` at low strength) replaces the still colour gradient.

## 4. Out of scope

- The PDF report stays neutral grey on white (made for printing).
- Layout, copy, the sorting story and the previews stay as they are; they pick up the new tokens.

## 5. Testing

- `tests/lib/tokens.test.ts`: every pair in section 1 in both themes, the panel pairs, text on the spotlight, text over the strongest contour line.
- Shader tests: colour reading of the new tokens, the clock.
- Component tests for the logo, progress ring, personas and hero updated to the new tokens.
- e2e: `showcase.spec.ts` as before, plus a check that no element on the home page uses gradient text (`background-clip: text`); axe on every page in light and dark.
- Review screenshots (`SCREENS=1`), viewed before the work is called done.
- `pnpm size` passes.
