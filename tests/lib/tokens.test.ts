import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { contrast, mixHex } from '@/lib/contrast';
import { AURORA_ALPHA } from '@/lib/aurora';
import { BRAND_COLOURS } from '@/lib/celebrate';

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
  it.each(['--fg', '--muted-fg', '--danger', '--accent'])('%s meets AA on --surface and --neutral-bg', (name) => {
    expect(contrast(t[name], t['--surface'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t[name], t['--neutral-bg'])).toBeGreaterThanOrEqual(4.5);
  });
  it('--neutral-fg meets AA on --neutral-bg', () => {
    expect(contrast(t['--neutral-fg'], t['--neutral-bg'])).toBeGreaterThanOrEqual(4.5);
  });
  it('--on-primary meets AA on --primary', () => {
    expect(contrast(t['--on-primary'], t['--primary'])).toBeGreaterThanOrEqual(4.5);
  });
  // Form controls and outline pills are outlined in --border-strong (WCAG 1.4.11, 3:1).
  it('--border-strong meets 3:1 on --bg and --surface', () => {
    expect(contrast(t['--border-strong'], t['--bg'])).toBeGreaterThanOrEqual(3);
    expect(contrast(t['--border-strong'], t['--surface'])).toBeGreaterThanOrEqual(3);
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

// Status pills keep their colours through the Eucalyptus retheme (design doc, section 1).
it('the status tokens are unchanged', () => {
  const dk = tokens('[data-theme="dark"]');
  expect([light['--ok-fg'], light['--warn-fg'], light['--danger']]).toEqual(['#166534', '#92400e', '#b91c1c']);
  expect([dk['--ok-fg'], dk['--warn-fg'], dk['--danger']]).toEqual(['#86efac', '#fcd34d', '#f87171']);
});
