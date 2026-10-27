import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { contrast } from '@/lib/contrast';

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

describe.each([['light', light], ['dark', dark]] as const)('%s theme', (_, t) => {
  it.each(['--lift-1', '--lift-2', '--lift-3'])('%s meets AA on --bg', (name) => {
    expect(contrast(t[name], t['--bg'])).toBeGreaterThanOrEqual(4.5);
  });
  it.each(['--panel-fg', '--panel-muted-fg', '--panel-lift-1', '--panel-lift-2', '--panel-lift-3'])('%s meets AA on --panel-bg', (name) => {
    expect(contrast(t[name], t['--panel-bg'])).toBeGreaterThanOrEqual(4.5);
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

it('the logo stops are the light Liftoff stops and only defined in :root', () => {
  expect([light['--logo-1'], light['--logo-2'], light['--logo-3']]).toEqual([light['--lift-1'], light['--lift-2'], light['--lift-3']]);
  expect(Object.keys(tokens('[data-theme="dark"]')).filter((k) => k.startsWith('--logo-') || k === '--on-lift')).toEqual([]);
});
