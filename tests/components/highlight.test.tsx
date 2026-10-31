// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Highlight } from '@/components/ui/highlight';

// Marker highlights (Billabong design doc sections 2 and 9) sit behind --fg text only: dark --muted-fg
// on a highlight is about 3.5:1.
describe('Highlight', () => {
  it('is a mark with the highlight utility, amber by default', () => {
    render(<p>Find <Highlight>grants</Highlight> fast</p>);
    const mark = screen.getByText('grants');
    expect(mark.tagName).toBe('MARK');
    expect(mark).toHaveClass('highlight', 'text-fg', '[--hl:var(--hl-amber)]');
  });

  it.each(['amber', 'sage', 'sky'] as const)('sets the %s tone', (tone) => {
    render(<Highlight tone={tone}>phrase</Highlight>);
    expect(screen.getByText('phrase')).toHaveClass('highlight', `[--hl:var(--hl-${tone})]`);
  });

  it('keeps --fg text inside muted text', () => {
    render(<p className="text-muted-fg">Some <Highlight tone="sky">key words</Highlight></p>);
    const mark = screen.getByText('key words');
    expect(mark).toHaveClass('text-fg');
    expect(mark.className).not.toMatch(/muted/);
  });

  it('takes no className, so no caller can give it a muted (or any other) text colour', () => {
    // @ts-expect-error: Highlight has no className prop.
    render(<Highlight className="text-muted-fg">x</Highlight>);
    expect(screen.getByText('x').className).not.toMatch(/muted/);
  });
});

/** Every .tsx file under `dirs`, recursively. */
function tsxFiles(dirs: string[]): string[] {
  return dirs.flatMap((dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return tsxFiles([path]);
    return path.endsWith('.tsx') ? [path] : [];
  }));
}

/** The single-line string literals in `src` (where class names live; prose in comments is not one). */
function classStrings(src: string): string[] {
  return [...src.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)].map((m) => m[2]);
}

describe('highlight call sites', () => {
  const files = tsxFiles(['app', 'components']).map((f) => [f, readFileSync(f, 'utf8')] as const);

  it('use Highlight, never a raw <mark> or the utility on its own', () => {
    const own = join('components', 'ui', 'highlight.tsx');
    const hits = files.filter(([f]) => f !== own)
      .filter(([, src]) => /<mark\b/.test(src) || classStrings(src).some((s) => /(^|\s)highlight(\s|$)/.test(s)))
      .map(([f]) => f);
    expect(hits).toEqual([]);
  });

  it('never put muted text inside a Highlight', () => {
    const hits = files.flatMap(([f, src]) => [...src.matchAll(/<Highlight\b[\s\S]*?<\/Highlight>/g)]
      .filter((m) => /muted/.test(m[0])).map(() => f));
    expect(hits).toEqual([]);
  });
});
