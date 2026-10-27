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
});
