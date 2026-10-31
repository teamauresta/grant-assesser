import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { contrast, luminance, mixHex } from '@/lib/contrast';
import { AURORA_ALPHA } from '@/lib/aurora';
import { BRAND_COLOURS } from '@/lib/celebrate';
import { HIGHLIGHT_ALPHA } from '@/lib/highlight';

const css = readFileSync('app/globals.css', 'utf8');

/** The text of the first block that starts with `selector {`, up to its closing brace. */
function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No ${selector} block`);
  return css.slice(start, css.indexOf('}', start));
}

/** `--name: #hex;` pairs from the first block that starts with `selector {`. */
function tokens(selector: string): Record<string, string> {
  return Object.fromEntries([...block(selector).matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));
}

const light = tokens(':root');
const dark = { ...light, ...tokens('[data-theme="dark"]') };

/** The spotlight's strength (`--spot-mix: N%;`) in a theme block, as 0..1; the light value if unset. */
function spotMix(selector: string): number | undefined {
  const m = /--spot-mix:\s*(\d+(?:\.\d+)?)%/.exec(block(selector));
  return m ? Number(m[1]) / 100 : undefined;
}
const spots = { light: spotMix(':root')!, dark: spotMix('[data-theme="dark"]') ?? spotMix(':root')! };

describe.each([['light', light], ['dark', dark]] as const)('%s theme', (theme, t) => {
  it.each(['--fg', '--muted-fg', '--danger', '--accent'])('%s meets AA on --bg, --surface and --neutral-bg', (name) => {
    expect(contrast(t[name], t['--bg'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t[name], t['--surface'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t[name], t['--neutral-bg'])).toBeGreaterThanOrEqual(4.5);
  });
  it('--neutral-fg meets AA on --neutral-bg', () => {
    expect(contrast(t['--neutral-fg'], t['--neutral-bg'])).toBeGreaterThanOrEqual(4.5);
  });
  it('--on-primary meets AA on --primary', () => {
    expect(contrast(t['--on-primary'], t['--primary'])).toBeGreaterThanOrEqual(4.5);
  });
  // The danger button's label. It used --on-primary until the amber primary took dark text
  // (design doc section 11, Task 1).
  it('--on-danger meets AA on --danger', () => {
    expect(contrast(t['--on-danger'], t['--danger'])).toBeGreaterThanOrEqual(4.5);
  });
  // The calendar's today cell is --bg text on --accent.
  it('--bg meets AA on --accent', () => {
    expect(contrast(t['--bg'], t['--accent'])).toBeGreaterThanOrEqual(4.5);
  });
  // Form controls and outline pills are outlined in --border-strong (WCAG 1.4.11, 3:1).
  it('--border-strong meets 3:1 on --bg and --surface', () => {
    expect(contrast(t['--border-strong'], t['--bg'])).toBeGreaterThanOrEqual(3);
    expect(contrast(t['--border-strong'], t['--surface'])).toBeGreaterThanOrEqual(3);
  });
  // The wizard's choice cards (design doc section 11, Task 6): a --surface card, --bg on hover (not
  // --neutral-bg, on which --border-strong is under 3:1). The checked state's accent border, ring and
  // check icon, and the unchecked --border-strong outline, stand out from both fills (WCAG 1.4.11).
  it('choice card edges meet 3:1 on the card (--surface) and its hover (--bg)', () => {
    for (const fill of ['--surface', '--bg']) {
      expect(contrast(t['--accent'], t[fill])).toBeGreaterThanOrEqual(3);
      expect(contrast(t['--border-strong'], t[fill])).toBeGreaterThanOrEqual(3);
    }
  });
  // Chunky buttons (design doc section 4): the ledge is a darker amber under the amber fill. It is part
  // of the control's shape, so it must be visible against the page (WCAG 1.4.11, 3:1).
  it('the primary ledge stays visible on --bg (3:1)', () => {
    expect(contrast(t['--primary-ledge'], t['--bg'])).toBeGreaterThanOrEqual(3);
  });
  // The danger button's ledge (design doc section 4): a darker red than its fill, visible on the page.
  it('the danger ledge stays visible on --bg (3:1) and is darker than --danger', () => {
    expect(contrast(t['--danger-ledge'], t['--bg'])).toBeGreaterThanOrEqual(3);
    expect(luminance(t['--danger-ledge'])).toBeLessThan(luminance(t['--danger']));
  });
  // Marker highlights (design doc section 2) sit behind --fg text only, at HIGHLIGHT_ALPHA over --bg.
  it.each(['--hl-amber', '--hl-sage', '--hl-sky'])('--fg meets AA on %s', (name) => {
    expect(contrast(t['--fg'], mixHex(t['--bg'], t[name], HIGHLIGHT_ALPHA))).toBeGreaterThanOrEqual(4.5);
  });
  // The directory's filter chips (Billabong plan, Task 5): pressed is --bg text on an --fg fill;
  // unpressed is --fg on --surface inside a --border-strong outline, --neutral-bg on hover. The
  // pressed fill must read (AA, which also gives 3:1 against the page) and stand out from an
  // unpressed chip's fill (WCAG 1.4.11, 3:1).
  it('a pressed filter chip reads (AA) and stands out from the page and an unpressed chip (3:1)', () => {
    expect(contrast(t['--bg'], t['--fg'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t['--fg'], t['--surface'])).toBeGreaterThanOrEqual(3);
  });
  it('an unpressed filter chip still reads on hover (--fg on --neutral-bg)', () => {
    expect(contrast(t['--fg'], t['--neutral-bg'])).toBeGreaterThanOrEqual(4.5);
  });
  // A pressed chip on hover is drawn at 90% opacity over the page (hover:opacity-90): the fill is
  // --fg mixed 90% over --bg, and the --bg text stays --bg.
  it('a pressed filter chip still reads on hover, at 90% opacity', () => {
    const fill = mixHex(t['--bg'], t['--fg'], 0.9);
    expect(contrast(t['--bg'], fill)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(fill, t['--surface'])).toBeGreaterThanOrEqual(3);
  });
  // The accent focus ring (WCAG 1.4.11, 3:1) on the page. On --surface it is implied by the accent's
  // AA check above.
  it('the accent focus ring stays visible on --bg (3:1)', () => {
    expect(contrast(t['--accent'], t['--bg'])).toBeGreaterThanOrEqual(3);
  });
  const brand = ['--brand', '--brand-2', '--spark'];
  it.each(brand)('%s meets AA on --bg and --surface', (name) => {
    expect(contrast(t[name], t['--bg'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t[name], t['--surface'])).toBeGreaterThanOrEqual(4.5);
  });
  // A persona card's icon is its tone on a 14% tint of the same tone over --surface: a non-text
  // graphic, so 3:1.
  it.each(brand)('%s stays visible (3:1) on its own persona badge tint', (name) => {
    expect(contrast(t[name], mixHex(t['--surface'], t[name], 0.14))).toBeGreaterThanOrEqual(3);
  });
  // The hero paints --brand contour lines over --bg, at most AURORA_ALPHA strong. Text that lands on
  // the strongest line must stay AA; the headline phrase is --accent.
  it.each(['--fg', '--muted-fg', '--accent'])('%s meets AA on the strongest contour line', (name) => {
    expect(contrast(t[name], mixHex(t['--bg'], t['--brand'], AURORA_ALPHA[theme]))).toBeGreaterThanOrEqual(4.5);
  });
  // The cursor spotlight (useSpotlight) paints --fg at --spot-mix (per theme) over the card. Persona cards are
  // --surface; the type links sit on --bg. Text on either must stay AA at the highlight's centre.
  it.each(['--fg', '--muted-fg', '--accent'])('%s meets AA on the strongest spotlight', (name) => {
    expect(spots[theme]).toBeGreaterThan(0);
    expect(contrast(t[name], mixHex(t['--surface'], t['--fg'], spots[theme]))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t[name], mixHex(t['--bg'], t['--fg'], spots[theme]))).toBeGreaterThanOrEqual(4.5);
  });
  it.each(['--panel-fg', '--panel-muted-fg', '--panel-spark'])('%s meets AA on --panel-bg', (name) => {
    expect(contrast(t[name], t['--panel-bg'])).toBeGreaterThanOrEqual(4.5);
  });
  // The How it works previews are cards on the panel: their labels sit on --panel-surface.
  it.each(['--panel-fg', '--panel-muted-fg'])('%s meets AA on --panel-surface', (name) => {
    expect(contrast(t[name], t['--panel-surface'])).toBeGreaterThanOrEqual(4.5);
  });
  // Links on the panel use panelFocusRing (components/ui/focus-ring.ts): the light accent is too
  // close to the forest green.
  it('the panel focus ring (--panel-fg) stays visible on the panel (3:1)', () => {
    expect(contrast(t['--panel-fg'], t['--panel-bg'])).toBeGreaterThanOrEqual(3);
  });
  // The logo's compass is a non-text graphic (3:1). The logo uses --logo, the light --brand, in both
  // themes, so the mark looks the same everywhere.
  it('--on-logo stays visible on --logo (3:1)', () => {
    expect(contrast(t['--on-logo'], t['--logo'])).toBeGreaterThanOrEqual(3);
  });
});

// The panel's edge is decorative (WCAG 1.4.11 does not apply: the panel is not a control and its
// content stands on its own), so it is not in the AA lists above. It is invisible in light, where
// the dark panel already stands out, and a visible line in dark, where the panel sits on a dark page.
it('the panel border is defined in both themes', () => {
  expect(css).toMatch(/:root \{[^}]*--panel-border:\s*transparent;/);
  expect(tokens('[data-theme="dark"]')['--panel-border']).toMatch(/^#[0-9a-f]{6}$/i);
});

it('the logo is the light --brand and only defined in :root', () => {
  expect(light['--logo']).toBe(light['--brand']);
  // The raw block text, not the hex-only map, so a non-hex override such as var(--brand) is caught too.
  expect(block('[data-theme="dark"]')).not.toMatch(/--(on-)?logo\s*:/);
});

// canvas-confetti needs literal colours, so lib/celebrate.ts repeats the brand colours; keep them in step.
it('the confetti colours are the brand colours of both themes', () => {
  const brand = (t: Record<string, string>) => ['--brand', '--brand-2', '--spark'].map((n) => t[n].toLowerCase());
  expect(BRAND_COLOURS.map((c) => c.toLowerCase())).toEqual([...brand(light), ...brand(tokens('[data-theme="dark"]'))]);
});

it('no Liftoff token remains', () => {
  expect(css).not.toMatch(/--(panel-)?lift-|--logo-\d|--on-lift/);
});

// Eucalyptus has no gradient text (design doc, section 2).
it('no Liftoff utility or gradient text remains', () => {
  expect(css).not.toMatch(/@utility (text-lift|text-lift-panel|glow-lift)\b/);
  expect(css).not.toMatch(/background-clip:\s*text/);
});

// Status pills keep their colours through the Eucalyptus retheme (design doc, section 1).
it('the status tokens are unchanged', () => {
  const dk = tokens('[data-theme="dark"]');
  expect([light['--ok-fg'], light['--warn-fg'], light['--danger']]).toEqual(['#166534', '#92400e', '#b91c1c']);
  expect([dk['--ok-fg'], dk['--warn-fg'], dk['--danger']]).toEqual(['#86efac', '#fcd34d', '#f87171']);
});

/** Every file under `dirs`, recursively, as paths relative to the repo root. */
function walk(dirs: string[]): string[] {
  return dirs.flatMap((dir) => readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name)));
}

// Billabong uses one family, Rubik, with tabular digits for numbers (design doc section 3). The match
// is on the raw text, so a comment that names monospace counts too. The one allowed line is the
// @theme entry that unsets --font-mono, which removes the font-mono utility.
it('no monospace in app/, components/ or lib/', () => {
  const files = walk(['app', 'components', 'lib']).filter((f) => /\.(m?[jt]sx?|css)$/.test(f));
  const hits = files.flatMap((f) => readFileSync(f, 'utf8').split('\n').map((line, i) => [f, i + 1, line] as const))
    .filter(([, , line]) => /\bfont-mono\b|--font-mono|monospace/.test(line))
    .filter(([f, , line]) => !(f === join('app', 'globals.css') && /^\s*--font-mono: initial;$/.test(line)));
  expect(hits.map(([f, n]) => `${f}:${n}`)).toEqual([]);
});

/** The body of `@utility name { ... }` in globals.css, nested blocks included. */
function utility(name: string): string {
  const start = css.indexOf(`@utility ${name} {`);
  if (start < 0) throw new Error(`No @utility ${name}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`Unclosed @utility ${name}`);
}

// Marker highlights (design doc section 2). The contrast checks above use HIGHLIGHT_ALPHA; the rule
// that paints the band must use the same strength.
describe('the highlight utility', () => {
  const rule = utility('highlight');

  it('mixes its tone at HIGHLIGHT_ALPHA', () => {
    const mixes = [...rule.matchAll(/color-mix\(in srgb, var\(--hl, var\(--hl-amber\)\) (\d+(?:\.\d+)?)%, transparent\)/g)];
    expect(mixes).toHaveLength(1);
    expect(Number(mixes[0][1])).toBe(HIGHLIGHT_ALPHA * 100);
  });

  it('paints --fg text', () => {
    expect(rule).toMatch(/^\s*color: var\(--fg\);/m);
  });

  // The CSS minifier gives a color-mix() a fallback for browsers without it: the first colour at full
  // strength, and --fg on a full-strength highlight is under 2:1 in dark. So the band is painted only
  // inside @supports, and without color-mix there is no band at all (tests/e2e/billabong.spec.ts
  // checks the built CSS).
  it('paints the band only where color-mix() is supported', () => {
    const supports = /@supports \(color: color-mix\(in srgb, red, red\)\) \{([^}]*)\}/.exec(rule);
    expect(supports?.[1]).toMatch(/background: color-mix\(/);
    expect(rule.replace(supports![0], '')).not.toMatch(/background(-color)?:\s*(color-mix|var)/);
  });

  // Without color-mix() there must be no band at all, whatever element carries the utility (a <mark>
  // brings the browser's own full-strength yellow, which preflight keeps). So the base rule clears the
  // background, and every background outside the @supports and forced-colours blocks is transparent.
  it('clears the background outside @supports', () => {
    const base = rule.slice(0, rule.indexOf('@'));
    expect(base).toMatch(/^\s*background: transparent;/m);
    const outside = rule.replace(/@(supports|media)[^{]*\{[^}]*\}/g, '');
    const backgrounds = [...outside.matchAll(/background(?:-color)?:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(backgrounds.length).toBeGreaterThan(0);
    expect(backgrounds.every((v) => v === 'transparent')).toBe(true);
  });

  it('uses the system Mark colours in forced-colours mode', () => {
    expect(rule).toMatch(/@media \(forced-colors: active\) \{\s*background: Mark;\s*color: MarkText;\s*\}/);
  });

  // No bg-hl-* colour utilities: their opacity modifier (bg-hl-amber/35) has the same full-strength
  // fallback, so highlights go through the utility (components/ui/highlight.tsx) only.
  it('has no hl colour in the theme', () => {
    expect(css).not.toMatch(/--color-hl-/);
  });
});

// The window frame's shadow (design doc section 4), one per theme: a black shadow barely shows on the
// dark page, so dark sets its own.
it('the window shadow is a token in both themes, used by the shadow-window utility', () => {
  expect(block(':root')).toMatch(/--window-shadow:\s*[^;]+;/);
  expect(block('[data-theme="dark"]')).toMatch(/--window-shadow:\s*[^;]+;/);
  expect(utility('shadow-window')).toMatch(/box-shadow:\s*var\(--window-shadow\);/);
});
