// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import userEvent from '@testing-library/user-event';

let unsupported = false;
let mounts = 0;
let lose: () => void = () => {};
vi.mock('@/components/home/aurora-canvas', async () => {
  const { useState } = await import('react');
  return {
    default: function MockCanvas({ playing, onUnsupported, onLost }: { playing: boolean; onUnsupported: () => void; onLost: () => void }) {
      const [instance] = useState(() => ++mounts);
      if (unsupported) queueMicrotask(onUnsupported);
      lose = onLost;
      return <canvas data-testid="aurora" data-instance={instance} data-playing={String(playing)} />;
    },
  };
});

import { HeroAurora } from '@/components/home/hero-aurora';
import { AURORA_KEY } from '@/lib/aurora';

/** Stubs matchMedia; returns a switch that changes the reduced-motion setting mid-session. */
const media = (reduced: boolean) => {
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (q: string) => ({
    get matches() { return reduced && q.includes('reduce'); },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }));
  return (next: boolean) => { reduced = next; listeners.forEach((fn) => fn()); };
};

/** Fakes the page clock that HeroAurora times its fresh canvases with. */
const clock = (ms: number) => vi.spyOn(performance, 'now').mockReturnValue(ms);

/** Fakes the tab going to the background or coming back, with its visibilitychange event. */
const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => { unsupported = false; mounts = 0; lose = () => {}; localStorage.clear(); });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (document as { visibilityState?: unknown }).visibilityState;
});

describe('HeroAurora', () => {
  it('is not in the server HTML', () => {
    expect(renderToString(<HeroAurora />)).not.toMatch(/canvas|button/);
  });

  it('plays, and the pause button stops it and is remembered', async () => {
    media(false);
    render(<HeroAurora />);
    const canvas = await screen.findByTestId('aurora');
    expect(canvas).toHaveAttribute('data-playing', 'true');
    const button = screen.getByRole('button', { name: 'Pause background animation' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(canvas).toHaveAttribute('data-playing', 'false');
    expect(localStorage.getItem(AURORA_KEY)).toBe('paused');
  });

  it('starts paused when paused on an earlier visit', async () => {
    media(false);
    localStorage.setItem(AURORA_KEY, 'paused');
    render(<HeroAurora />);
    expect(await screen.findByTestId('aurora')).toHaveAttribute('data-playing', 'false');
    expect(screen.getByRole('button', { name: 'Pause background animation' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('under reduced motion draws one still frame and offers no button (nothing moves)', async () => {
    media(true);
    render(<HeroAurora />);
    expect(await screen.findByTestId('aurora')).toHaveAttribute('data-playing', 'false');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('without WebGL shows still contour rings and no button', async () => {
    media(false);
    unsupported = true;
    const { container } = render(<HeroAurora />);
    await waitFor(() => expect(container.querySelector('[data-aurora-fallback]')).not.toBeNull());
    const fallback = container.querySelector('[data-aurora-fallback]')!;
    const classes = [fallback, ...fallback.querySelectorAll('*')].map((el) => el.getAttribute('class') ?? '').join(' ');
    expect(classes).toContain('repeating-radial-gradient');
    expect(classes).toContain('var(--brand)');
    expect(screen.queryByTestId('aurora')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('hides the drawing from assistive technology', async () => {
    media(false);
    render(<HeroAurora />);
    expect((await screen.findByTestId('aurora')).closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('stops and drops the button when reduced motion is turned on mid-session', async () => {
    const setReduced = media(false);
    render(<HeroAurora />);
    expect(await screen.findByTestId('aurora')).toHaveAttribute('data-playing', 'true');
    expect(screen.getByRole('button', { name: 'Pause background animation' })).toBeInTheDocument();
    act(() => setReduced(true));
    expect(screen.getByTestId('aurora')).toHaveAttribute('data-playing', 'false');
    expect(screen.queryByRole('button')).toBeNull();
  });

  // iOS drops WebGL contexts when the page goes to the background: start again on a fresh canvas,
  // and only settle for the still contour rings if that one is lost too.
  it('remounts the canvas after a lost context, keeping the pause button, and falls back after a second loss', async () => {
    media(false);
    const { container } = render(<HeroAurora />);
    expect(await screen.findByTestId('aurora')).toHaveAttribute('data-instance', '1');
    const button = screen.getByRole('button', { name: 'Pause background animation' });
    button.focus();
    act(() => lose());
    expect(screen.getByTestId('aurora')).toHaveAttribute('data-instance', '2');
    expect(screen.getByRole('button', { name: 'Pause background animation' })).toBe(button);
    expect(button).toHaveFocus();
    act(() => lose());
    expect(container.querySelector('[data-aurora-fallback]')).not.toBeNull();
    expect(screen.queryByTestId('aurora')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  // Backgrounding a tab twice, hours apart, is not a broken GPU: only a loss soon after a fresh
  // canvas counts against it.
  it('gives a fresh canvas again when the last one ran for more than 30 seconds', async () => {
    media(false);
    clock(1_000);
    const { container } = render(<HeroAurora />);
    expect(await screen.findByTestId('aurora')).toHaveAttribute('data-instance', '1');
    act(() => lose());
    expect(screen.getByTestId('aurora')).toHaveAttribute('data-instance', '2');
    clock(1_000 + 2 * 3600_000);
    act(() => lose());
    expect(screen.getByTestId('aurora')).toHaveAttribute('data-instance', '3');
    expect(screen.getByRole('button', { name: 'Pause background animation' })).toBeInTheDocument();
    clock(1_000 + 2 * 3600_000 + 20_000);
    act(() => lose());
    expect(container.querySelector('[data-aurora-fallback]')).not.toBeNull();
    expect(screen.queryByTestId('aurora')).toBeNull();
  });

  // A canvas made in a background tab may be lost again at once: wait until the page is seen.
  it('waits for the tab to be visible before replacing a canvas lost in the background', async () => {
    media(false);
    clock(0);
    const { container } = render(<HeroAurora />);
    expect(await screen.findByTestId('aurora')).toHaveAttribute('data-instance', '1');
    act(() => setVisibility('hidden'));
    act(() => lose());
    expect(screen.queryByTestId('aurora')).toBeNull();
    expect(container.querySelector('[data-aurora-fallback]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Pause background animation' })).toBeInTheDocument();
    clock(3600_000);
    act(() => setVisibility('visible'));
    expect(screen.getByTestId('aurora')).toHaveAttribute('data-instance', '2');
    // The 30 seconds count from when the fresh canvas appeared, not from the loss.
    clock(3600_000 + 10_000);
    act(() => lose());
    expect(container.querySelector('[data-aurora-fallback]')).not.toBeNull();
  });

  // Backgrounding is not a GPU failure, however soon it comes after a fresh canvas: a loss only
  // counts when the tab stayed in view since that canvas appeared. Safari may report the loss after
  // the tab is back, so having been hidden is enough.
  it('does not count a loss after the tab was hidden, even within 30 seconds of a fresh canvas', async () => {
    media(false);
    clock(0);
    const { container } = render(<HeroAurora />);
    await screen.findByTestId('aurora');
    act(() => lose());
    expect(screen.getByTestId('aurora')).toHaveAttribute('data-instance', '2');
    clock(5_000);
    act(() => setVisibility('hidden'));
    clock(10_000);
    act(() => lose());
    expect(screen.queryByTestId('aurora')).toBeNull();
    expect(container.querySelector('[data-aurora-fallback]')).toBeNull();
    clock(12_000);
    act(() => setVisibility('visible'));
    expect(screen.getByTestId('aurora')).toHaveAttribute('data-instance', '3');
    // Hidden and back again, then the loss arrives late: still a background tab, so a fresh canvas.
    clock(15_000);
    act(() => setVisibility('hidden'));
    act(() => setVisibility('visible'));
    act(() => lose());
    expect(screen.getByTestId('aurora')).toHaveAttribute('data-instance', '4');
    expect(container.querySelector('[data-aurora-fallback]')).toBeNull();
  });

  it('marks the full-bleed layer, so the page clips its overhang only where the aurora is', async () => {
    media(false);
    const { container } = render(<HeroAurora />);
    await screen.findByTestId('aurora');
    expect(container.querySelector('[data-hero-aurora]')).toHaveAttribute('aria-hidden', 'true');
  });
});
