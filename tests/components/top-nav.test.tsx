// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import { TopNav } from '@/components/layout/top-nav';
import { MobileHeader } from '@/components/layout/mobile-header';
import { BottomNav } from '@/components/layout/bottom-nav';

// next/link drops the trailing slash under Vitest (trailingSlash is a next.config setting).
const path = (p: string) => expect.stringMatching(new RegExp(`^${p}/?$`));

const renderAt = (p: string) => {
  pathname = p;
  return render(<TopNav />);
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
    render(<MobileHeader />);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky', 'top-0', 'bg-bg', 'h-(--bar-h)', 'pt-[calc(0.5rem+env(safe-area-inset-top))]', 'pb-2', 'print:static');
    expect(header.firstElementChild).toHaveClass('mx-2', 'h-14', 'rounded-lg', 'bg-neutral-bg', 'border', 'border-border');
    expect(within(header).getByRole('link', { name: 'Grant Navigator' })).toHaveAttribute('aria-current', 'page');
    expect(within(header).getByRole('link', { name: 'Choose persona' })).toBeInTheDocument();
    expect(within(header).queryByRole('link', { name: 'Start assessment' })).toBeNull();
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
});
