import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { contrast, mixHex } from '@/lib/contrast';
import { AURORA_ALPHA } from '@/lib/aurora';
import { LIFT_COLOURS } from '@/lib/celebrate';

const css = readFileSync('app/globals.css', 'utf8');

/** `--name: #hex;` pairs from the first block that starts with `selector {`. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No ${selector} block`);
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));
}

const light = tokens(':root');
const dark = { ...light, ...tokens('[data-theme="dark"]') };

/** The spotlight's strength (`--spot-mix: N%;`) in a theme block, as 0..1; the light value if unset. */
function spotMix(selector: string): number | undefined {
  const start = css.indexOf(`${selector} {`);
  const m = /--spot-mix:\s*(\d+(?:\.\d+)?)%/.exec(css.slice(start, css.indexOf('}', start)));
  return m ? Number(m[1]) / 100 : undefined;
}
const spots = { light: spotMix(':root')!, dark: spotMix('[data-theme="dark"]') ?? spotMix(':root')! };

describe.each([['light', light], ['dark', dark]] as const)('%s theme', (theme, t) => {
  it.each(['--lift-1', '--lift-2', '--lift-3'])('%s meets AA on --bg', (name) => {
    expect(contrast(t[name], t['--bg'])).toBeGreaterThanOrEqual(4.5);
  });
  // The hero aurora paints a mix of the stops over --bg, at most AURORA_ALPHA strong. Text that
  // lands on it must stay AA: check each stop and each half-and-half pair at full strength.
  const stops = ['--lift-1', '--lift-2', '--lift-3'];
  const fields = [...stops.map((s) => t[s]), mixHex(t['--lift-1'], t['--lift-2'], 0.5), mixHex(t['--lift-2'], t['--lift-3'], 0.5), mixHex(t['--lift-1'], t['--lift-3'], 0.5)];
  it.each(['--fg', '--muted-fg'])('%s meets AA on the strongest aurora', (name) => {
    for (const field of fields) {
      expect(contrast(t[name], mixHex(t['--bg'], field, AURORA_ALPHA[theme]))).toBeGreaterThanOrEqual(4.5);
    }
  });
  // The cursor spotlight (useSpotlight) paints --fg at --spot-mix (per theme) over the card. Persona cards are
  // --surface; the type links sit on --bg. Text on either must stay AA at the highlight's centre.
  it.each(['--fg', '--muted-fg', '--accent'])('%s meets AA on the strongest spotlight', (name) => {
    expect(spots[theme]).toBeGreaterThan(0);
    expect(contrast(t[name], mixHex(t['--surface'], t['--fg'], spots[theme]))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t[name], mixHex(t['--bg'], t['--fg'], spots[theme]))).toBeGreaterThanOrEqual(4.5);
  });
  it.each(['--panel-fg', '--panel-muted-fg', '--panel-lift-1', '--panel-lift-2', '--panel-lift-3'])('%s meets AA on --panel-bg', (name) => {
    expect(contrast(t[name], t['--panel-bg'])).toBeGreaterThanOrEqual(4.5);
  });
  // The How it works previews are cards on the panel: their labels sit on --panel-surface.
  it.each(['--panel-fg', '--panel-muted-fg'])('%s meets AA on --panel-surface', (name) => {
    expect(contrast(t[name], t['--panel-surface'])).toBeGreaterThanOrEqual(4.5);
  });
  it('the accent focus ring stays visible on the panel (3:1)', () => {
    expect(contrast(t['--accent'], t['--panel-bg'])).toBeGreaterThanOrEqual(3);
  });
  // The logo's white compass is a non-text graphic (3:1). White fails on the dark-theme --lift-*
  // stops (1.9 to 2.7:1), so the logo uses --logo-*, the light stops, in both themes.
  it.each(['--logo-1', '--logo-2', '--logo-3'])('--on-lift stays visible on %s (3:1)', (name) => {
    expect(contrast(t['--on-lift'], t[name])).toBeGreaterThanOrEqual(3);
  });
});

// The panel's edge is decorative (WCAG 1.4.11 does not apply: the panel is not a control and its
// content stands on its own), so it is not in the AA lists above. It is invisible in light, where
// the dark panel already stands out, and a visible line in dark, where --panel-bg nearly matches --bg.
it('the panel border is defined in both themes', () => {
  expect(css).toMatch(/:root \{[^}]*--panel-border:\s*transparent;/);
  expect(tokens('[data-theme="dark"]')['--panel-border']).toMatch(/^#[0-9a-f]{6}$/i);
});

it('the logo stops are the light Liftoff stops and only defined in :root', () => {
  expect([light['--logo-1'], light['--logo-2'], light['--logo-3']]).toEqual([light['--lift-1'], light['--lift-2'], light['--lift-3']]);
  expect(Object.keys(tokens('[data-theme="dark"]')).filter((k) => k.startsWith('--logo-') || k === '--on-lift')).toEqual([]);
});

// canvas-confetti needs literal colours, so lib/celebrate.ts repeats the stops; keep them in step.
it('the confetti colours are the Liftoff stops of both themes', () => {
  const stops = (t: Record<string, string>) => ['--lift-1', '--lift-2', '--lift-3'].map((n) => t[n].toLowerCase());
  expect(LIFT_COLOURS.map((c) => c.toLowerCase())).toEqual([...stops(light), ...stops(tokens('[data-theme="dark"]'))]);
});
