// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Highlight } from '@/components/ui/highlight';

// Marker highlights (Billabong design doc sections 2, 4 and 9) sit behind --fg text only: dark
// --muted-fg on a highlight is about 3.5:1.
//
// The element is a <span>, not a <mark> (design doc section 11, Task 4 review): the band is stylistic
// emphasis, not relevance, and screen readers announce a mark as "highlighted", even in a heading.
// The --fg text comes from the highlight utility itself (tests/lib/tokens.test.ts, "paints --fg
// text"), not a text-fg class: .text-fg comes later in the CSS and would beat the utility's MarkText
// in forced colours. tests/e2e/billabong.spec.ts checks the computed colours in a browser.
describe('Highlight', () => {
  it('is a span with the highlight utility, amber by default', () => {
    render(<p>Find <Highlight>grants</Highlight> fast</p>);
    const el = screen.getByText('grants');
    expect(el.tagName).toBe('SPAN');
    expect(el).toHaveClass('highlight', '[--hl:var(--hl-amber)]');
  });

  it.each(['amber', 'sage', 'sky'] as const)('sets the %s tone', (tone) => {
    render(<Highlight tone={tone}>phrase</Highlight>);
    expect(screen.getByText('phrase')).toHaveClass('highlight', `[--hl:var(--hl-${tone})]`);
  });

  it('carries no text colour class, so the utility\'s --fg (and MarkText in forced colours) applies', () => {
    render(<p className="text-muted-fg">Some <Highlight tone="sky">key words</Highlight></p>);
    const el = screen.getByText('key words');
    expect([...el.classList].filter((c) => /^text-/.test(c))).toEqual([]);
  });

  it('takes no className, so no caller can give it a muted (or any other) text colour', () => {
    // @ts-expect-error: Highlight has no className prop.
    render(<Highlight className="text-muted-fg">x</Highlight>);
    expect(screen.getByText('x').className).not.toMatch(/muted/);
  });
});

/** Every .ts and .tsx file under `dirs`, recursively. */
function sourceFiles(dirs: string[]): string[] {
  return dirs.flatMap((dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles([path]);
    return /\.tsx?$/.test(path) ? [path] : [];
  }));
}

/**
 * The single-line string literals in `src` (where class names live; prose in comments is not one).
 * A rough scan: an apostrophe in a comment can pair with a later quote and make a false "literal",
 * so a hit is a file to look at, and a false positive is fixed by rewording the comment.
 */
function classStrings(src: string): string[] {
  return [...src.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)].map((m) => m[2]);
}

describe('highlight call sites', () => {
  const files = sourceFiles(['app', 'components', 'lib']).map((f) => [f, readFileSync(f, 'utf8')] as const);

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
