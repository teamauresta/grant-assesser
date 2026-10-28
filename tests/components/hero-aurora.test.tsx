// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import userEvent from '@testing-library/user-event';

let unsupported = false;
vi.mock('@/components/home/aurora-canvas', () => ({
  default: ({ playing, onUnsupported }: { playing: boolean; onUnsupported: () => void }) => {
    if (unsupported) queueMicrotask(onUnsupported);
    return <canvas data-testid="aurora" data-playing={String(playing)} />;
  },
}));

import { HeroAurora } from '@/components/home/hero-aurora';
import { AURORA_KEY } from '@/lib/aurora';

const media = (reduced: boolean) => vi.stubGlobal('matchMedia', (q: string) => ({
  matches: reduced && q.includes('reduce'), addEventListener: () => {}, removeEventListener: () => {},
}));

beforeEach(() => { unsupported = false; localStorage.clear(); });
afterEach(() => vi.unstubAllGlobals());

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

  it('without WebGL shows a still gradient and no button', async () => {
    media(false);
    unsupported = true;
    const { container } = render(<HeroAurora />);
    await waitFor(() => expect(container.querySelector('[data-aurora-fallback]')).not.toBeNull());
    expect(screen.queryByTestId('aurora')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('hides the drawing from assistive technology', async () => {
    media(false);
    render(<HeroAurora />);
    expect((await screen.findByTestId('aurora')).closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
