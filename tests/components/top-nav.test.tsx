// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import { TopNav } from '@/components/layout/top-nav';
import { MobileHeader } from '@/components/layout/mobile-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The logo is rendered on the server by the layout and passed in, so the top bar's client code never
// imports the art manifest (design doc section 11, Art landed).
const logo = <span data-testid="logo" />;

// next/link drops the trailing slash under Vitest (trailingSlash is a next.config setting).
const path = (p: string) => expect.stringMatching(new RegExp(`^${p}/?$`));

const renderAt = (p: string) => {
  pathname = p;
  return render(<TopNav logo={logo} />);
};

afterEach(cleanup);

// The top bar (docs/plans/2026-10-31-billabong-design.md, section 4): an amber "Start assessment"
// button on the right, hidden on /assess/ (the wizard and its results), where it would lead nowhere.
describe('TopNav', () => {
  for (const p of ['/', '/programs/', '/programs/rdti/', '/plan/', '/report/', '/settings/', '/assessment-guide/']) {
    it(`shows Start assessment on ${p}`, () => {
      renderAt(p);
      const cta = screen.getByRole('link', { name: 'Start assessment' });
      expect(cta).toHaveAttribute('href', path('/assess'));
      // A primary button (amber with a ledge), not a nav link.
      expect(cta).toHaveClass('bg-primary', 'ledge');
      expect(within(screen.getByRole('navigation', { name: 'Primary' })).queryByRole('link', { name: 'Start assessment' })).toBeNull();
    });
  }

  for (const p of ['/assess/', '/assess', '/assess/results/']) {
    it(`hides Start assessment on ${p}`, () => {
      renderAt(p);
      expect(screen.queryByRole('link', { name: 'Start assessment' })).toBeNull();
      // The nav item is still there and marked current.
      expect(screen.getByRole('link', { name: 'Assess' })).toHaveAttribute('aria-current', 'page');
    });
  }

  it('keeps the banner landmark, the primary nav, the persona chip and the current item', () => {
    renderAt('/plan/');
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: 'Choose persona' })).toHaveAttribute('href', path('/settings'));
    expect(within(header).getByRole('link', { name: 'My Plan' })).toHaveAttribute('aria-current', 'page');
    expect(within(header).getByRole('link', { name: 'Programs' })).not.toHaveAttribute('aria-current');
  });

  it('is an inset rounded bar on --neutral-bg inside a sticky header', () => {
    renderAt('/');
    const header = screen.getByRole('banner');
    // 8px down, below the notch: the band's padding (a margin on the bar would collapse through it),
    // and 8px under the bar; the band is --bar-h tall, the height everything that clears it uses.
    expect(header).toHaveClass('sticky', 'top-0', 'bg-bg', 'h-(--bar-h)', 'pt-[calc(0.5rem+env(safe-area-inset-top))]', 'pb-2', 'print:static');
    const bar = header.firstElementChild!;
    expect(bar).toHaveClass('mx-2', 'rounded-lg', 'bg-neutral-bg', 'border', 'border-border', 'h-14');
  });

  // The underline is a background, which forced colours remove; it draws in CanvasText there, as the
  // active tab's does (components/ui/tabs.tsx).
  it("draws the current item's underline in the accent, and in CanvasText under forced colours", () => {
    renderAt('/plan/');
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(nav).getByRole('link', { name: 'My Plan' })).toHaveClass('after:bg-accent', 'forced-colors:after:bg-[CanvasText]');
    expect(within(nav).getByRole('link', { name: 'Programs' })).not.toHaveClass('after:bg-accent');
  });

  it('keeps 44px targets on the nav items', () => {
    renderAt('/');
    for (const link of within(screen.getByRole('navigation', { name: 'Primary' })).getAllByRole('link')) {
      expect(link).toHaveClass('min-h-11');
    }
  });
});

describe('MobileHeader', () => {
  it('is the same inset bar with the logo and persona chip, and no Start assessment', () => {
    pathname = '/';
    render(<MobileHeader logo={logo} />);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky', 'top-0', 'bg-bg', 'h-(--bar-h)', 'pt-[calc(0.5rem+env(safe-area-inset-top))]', 'pb-2', 'print:static');
    expect(header.firstElementChild).toHaveClass('mx-2', 'h-14', 'rounded-lg', 'bg-neutral-bg', 'border', 'border-border');
    expect(within(header).getByRole('link', { name: 'Grant Navigator' })).toHaveAttribute('aria-current', 'page');
    expect(within(within(header).getByRole('link', { name: 'Grant Navigator' })).getByTestId('logo')).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: 'Choose persona' })).toBeInTheDocument();
    expect(within(header).queryByRole('link', { name: 'Start assessment' })).toBeNull();
  });
});

describe('the logo in the bars', () => {
  it('sits inside the brand link of the top bar, before the name', () => {
    renderAt('/programs/');
    const brand = screen.getByRole('link', { name: 'Grant Navigator' });
    expect(brand.firstElementChild).toBe(within(brand).getByTestId('logo'));
  });

  // A client component that imported LogoMark would ship components/ui/art.tsx and the art manifest
  // to every page (about 420 bytes gzipped on the home page).
  it('is never imported by the client bar components', () => {
    for (const file of ['brand-link.tsx', 'top-nav.tsx']) {
      const src = readFileSync(join(import.meta.dirname, '..', '..', 'components', 'layout', file), 'utf8');
      expect(src.startsWith("'use client'")).toBe(true);
      expect(src).not.toMatch(/logo-mark|components\/ui\/art/);
    }
  });
});

describe('BottomNav', () => {
  it('is an inset rounded bar clear of the home indicator, with the current item in the accent', () => {
    pathname = '/programs/rdti/';
    render(<BottomNav />);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    // The band is --bottom-bar-h tall (the 58px bar over max(8px, the home indicator)); not printed.
    expect(nav).toHaveClass('fixed', 'bottom-0', 'bg-bg', 'h-(--bottom-bar-h)', 'print:hidden');
    const bar = nav.firstElementChild!;
    expect(bar).toHaveClass('mx-2', 'rounded-lg', 'bg-neutral-bg', 'border', 'border-border');
    const current = within(nav).getByRole('link', { name: 'Programs' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toHaveClass('text-accent', 'font-semibold');
    for (const link of within(nav).getAllByRole('link')) expect(link).toHaveClass('min-h-14');
  });

  // With the sage pictures in place the icon no longer takes the accent, so the current item also
  // carries the top bar's state line: a 3px --accent underline (CanvasText in forced colours), drawn
  // as a pseudo-element, so the bar's height is unchanged.
  it('underlines the current item, and only it, with a 3px accent line', () => {
    pathname = '/plan/';
    render(<BottomNav />);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const current = within(nav).getByRole('link', { name: 'My Plan' });
    expect(current).toHaveClass('relative', 'after:absolute', 'after:h-[3px]', 'after:rounded-full', 'after:bg-accent', 'forced-colors:after:bg-[CanvasText]');
    for (const link of within(nav).getAllByRole('link').filter((l) => l !== current)) {
      expect(link.className).not.toContain('after:bg-accent');
    }
  });
});
