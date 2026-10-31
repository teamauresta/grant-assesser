// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, buttonClasses } from '@/components/ui/button';

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
    expect(c).toEqual(expect.arrayContaining(['bg-primary', 'text-on-primary', 'border', 'border-primary-ledge', 'ledge']));
  });

  it('secondary is the surface with a --border-strong outline and a ledge in the same colour', () => {
    render(<Button>Cancel</Button>);
    const c = classes(screen.getByRole('button', { name: 'Cancel' }));
    expect(c).toEqual(expect.arrayContaining(['bg-surface', 'text-fg', 'border', 'border-border-strong', 'ledge']));
    expect(c).not.toContain('bg-bg');
  });

  it('danger keeps its readable label and gets a ledge in a darker red', () => {
    render(<Button variant="danger">Remove</Button>);
    const c = classes(screen.getByRole('button', { name: 'Remove' }));
    expect(c).toEqual(expect.arrayContaining(['bg-danger', 'text-on-danger', 'border', 'border-danger-ledge', 'ledge']));
  });

  it('ghost has no ledge', () => {
    render(<Button variant="ghost">More</Button>);
    expect(classes(screen.getByRole('button', { name: 'More' }))).not.toContain('ledge');
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

  it('defaults to type="button" and keeps the focus ring and disabled styles', () => {
    render(<Button disabled>Off</Button>);
    const button = screen.getByRole('button', { name: 'Off' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toBeDisabled();
    expect(classes(button)).toEqual(expect.arrayContaining(['disabled:opacity-50', 'focus-visible:outline-2']));
  });
});

describe('buttonClasses', () => {
  it('styles a link as a button and keeps extra classes', () => {
    render(<a href="/assess/" className={buttonClasses({ variant: 'primary', className: 'px-6' })}>Start</a>);
    const c = classes(screen.getByRole('link', { name: 'Start' }));
    expect(c).toEqual(expect.arrayContaining(['bg-primary', 'text-on-primary', 'border-primary-ledge', 'ledge', 'px-6', 'min-h-11']));
  });
});
