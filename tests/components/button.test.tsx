// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, FILE_BUTTON_CLASSES, buttonClasses } from '@/components/ui/button';

/**
 * Chunky buttons (docs/plans/2026-10-31-billabong-design.md, section 4): the classes each variant
 * carries. The ledge's computed width and colour, and the press (and no press under reduced
 * motion), are checked in a real browser: tests/e2e/billabong.spec.ts.
 */

const classes = (el: HTMLElement) => el.className.split(/\s+/);

describe('Button', () => {
  it('primary is amber with dark text, a darker outline and the ledge', () => {
    render(<Button variant="primary">Save</Button>);
    const c = classes(screen.getByRole('button', { name: 'Save' }));
    expect(c).toEqual(expect.arrayContaining(['bg-primary', 'text-on-primary', 'border', 'border-b-3', 'border-primary-ledge', 'ledge']));
  });

  it('secondary is the surface with a --border-strong outline and a ledge in the same colour', () => {
    render(<Button>Cancel</Button>);
    const c = classes(screen.getByRole('button', { name: 'Cancel' }));
    expect(c).toEqual(expect.arrayContaining(['bg-surface', 'text-fg', 'border', 'border-b-3', 'border-border-strong', 'ledge']));
    expect(c).not.toContain('bg-bg');
  });

  it('danger keeps its readable label and gets a ledge in a darker red', () => {
    render(<Button variant="danger">Remove</Button>);
    const c = classes(screen.getByRole('button', { name: 'Remove' }));
    expect(c).toEqual(expect.arrayContaining(['bg-danger', 'text-on-danger', 'border', 'border-b-3', 'border-danger-ledge', 'ledge']));
  });

  it('ghost has no ledge', () => {
    render(<Button variant="ghost">More</Button>);
    const c = classes(screen.getByRole('button', { name: 'More' }));
    expect(c).not.toContain('ledge');
    expect(c).not.toContain('border-b-3');
  });

  // The ledge replaces the old press (a 0.98 scale).
  it('no variant scales when pressed', () => {
    for (const variant of ['primary', 'secondary', 'ghost', 'danger'] as const) {
      expect(buttonClasses({ variant })).not.toMatch(/scale-/);
    }
  });

  it('keeps the heights: md is 44px, sm is 36px, and icon-only buttons are square', () => {
    expect(classes(render(<Button>md</Button>).getByRole('button'))).toContain('min-h-11');
    expect(classes(render(<Button size="sm">sm</Button>).getByRole('button', { name: 'sm' }))).toContain('min-h-9');
    expect(buttonClasses({ iconOnly: true }).split(' ')).toContain('size-11');
    expect(buttonClasses({ iconOnly: true, size: 'sm' }).split(' ')).toContain('size-9');
  });

  // The hero's calls to action: a size of their own, so no className has to fight md's classes.
  it('lg is 48px with base text and wider padding, and has no md or sm size classes', () => {
    const c = buttonClasses({ size: 'lg' }).split(' ');
    expect(c).toEqual(expect.arrayContaining(['min-h-12', 'px-6', 'text-base']));
    expect(c).not.toEqual(expect.arrayContaining(['min-h-11']));
    expect(c).not.toContain('text-sm');
    expect(c).not.toContain('px-4');
    expect(buttonClasses({ size: 'lg', iconOnly: true }).split(' ')).toContain('size-12');
  });

  it('defaults to type="button" and keeps the focus ring and disabled styles', () => {
    render(<Button disabled>Off</Button>);
    const button = screen.getByRole('button', { name: 'Off' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toBeDisabled();
    expect(classes(button)).toEqual(expect.arrayContaining(['disabled:opacity-50', 'focus-visible:outline-2']));
  });
});

// The settings import's file button is drawn as a secondary button (design doc section 11, Task 9
// review). Every colour, border, hover and size class of a md secondary button needs its `file:`
// twin, so a change to the variant cannot leave the file button behind. Not twinned: the press
// (ledge, a pseudo-element cannot move), transitions, the focus ring (the input itself takes focus)
// and the layout and disabled classes.
describe('FILE_BUTTON_CLASSES', () => {
  it('has a file: twin of every colour, border, hover and size class of the secondary button', () => {
    const own = new Set(FILE_BUTTON_CLASSES.split(' '));
    const allowed = (c: string) => c === 'ledge' || /^(transition-|duration-|ease-|focus-visible:|disabled:|aria-disabled:)/.test(c)
      || ['inline-flex', 'select-none', 'items-center', 'justify-center', 'gap-2'].includes(c);
    const styled = buttonClasses({ variant: 'secondary' }).split(' ').filter((c) => !allowed(c));
    expect(styled).toEqual(expect.arrayContaining(['bg-surface', 'border-border-strong', 'border-b-3', 'hover:bg-neutral-bg', 'min-h-11']));
    const twin = (c: string) => (c.startsWith('hover:') ? `hover:file:${c.slice('hover:'.length)}` : `file:${c}`);
    expect(styled.map(twin).filter((t) => !own.has(t))).toEqual([]);
  });
});

describe('buttonClasses', () => {
  it('styles a link as a button and keeps extra classes', () => {
    render(<a href="/assess/" className={buttonClasses({ variant: 'primary', className: 'px-6' })}>Start</a>);
    const c = classes(screen.getByRole('link', { name: 'Start' }));
    expect(c).toEqual(expect.arrayContaining(['bg-primary', 'text-on-primary', 'border-primary-ledge', 'ledge', 'px-6', 'min-h-11']));
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

/** The text of each `<Button ...>` opening tag in `src`, braces balanced (so `() =>` does not end it). */
function buttonTags(src: string): string[] {
  const tags: string[] = [];
  for (const m of src.matchAll(/<Button\b/g)) {
    let depth = 0;
    let i = m.index!;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) break;
    }
    tags.push(src.slice(m.index!, i + 1));
  }
  return tags;
}

/**
 * The className a call site passes to a button: `className="..."` or `className={...}` on <Button>,
 * and `className: '...'` inside buttonClasses({ ... }).
 */
function callSiteClasses(src: string): string[] {
  const fromTags = buttonTags(src).flatMap((tag) => {
    const m = /\bclassName=(?:"([^"]*)"|\{([\s\S]*)\})/.exec(tag);
    return m ? [m[1] ?? m[2]] : [];
  });
  const fromCalls = [...src.matchAll(/buttonClasses\(\{([^}]*)\}\)/g)].flatMap((m) => {
    const c = /className:\s*(['"`])([\s\S]*?)\1/.exec(m[1]);
    return c ? [c[2]] : [];
  });
  return [...fromTags, ...fromCalls];
}

// cn() does not resolve Tailwind conflicts, so a call site's colour, size, padding, text or border
// class fights the button's own and the CSS order decides. className is for layout only.
const FORBIDDEN = /(^|[\s'"`:])(min-h-|h-|px-|py-|text-|bg-|hover:bg-|border|cursor-)/;

describe('button call sites', () => {
  it('the scan finds call sites and flags a conflicting class', () => {
    const sample = `<Button onClick={() => go()} className="self-start text-sm">x</Button>
      <Link className={buttonClasses({ variant: 'primary', className: 'min-h-12 shrink-0' })}>y</Link>`;
    const found = callSiteClasses(sample);
    expect(found).toEqual(['self-start text-sm', 'min-h-12 shrink-0']);
    expect(found.every((c) => FORBIDDEN.test(c))).toBe(true);
    expect(FORBIDDEN.test('-my-1.5 -mr-1.5 shrink-0 max-md:flex-1 sm:self-center glow-brand')).toBe(false);
  });

  it('pass layout classes only (margin, flex, self, width, shrink), never colour, size, padding, text or border', () => {
    const offenders = tsxFiles(['app', 'components'])
      .filter((f) => !f.endsWith(join('components', 'ui', 'button.tsx')))
      .flatMap((f) => callSiteClasses(readFileSync(f, 'utf8')).filter((c) => FORBIDDEN.test(c)).map((c) => `${f}: ${c}`));
    expect(offenders).toEqual([]);
  });
});
