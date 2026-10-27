// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { act, render, screen } from '@testing-library/react';
import { HeroParticles } from '@/components/home/hero-particles';
import { StaticScatter } from '@/components/home/static-scatter';

// The real field needs a canvas; stand in for it so the test can see when the lazy import lands.
vi.mock('@/components/home/particle-field', () => ({ default: () => <canvas data-testid="field" /> }));

const motion = (reduced: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduced && q === '(prefers-reduced-motion: reduce)' }));

/** A reduced-motion setting the test can flip, notifying listeners as a real MediaQueryList does. */
function switchableMotion(reduced: boolean) {
  const listeners = new Set<() => void>();
  const list = {
    get matches() { return reduced; },
    addEventListener: (_: string, l: () => void) => { listeners.add(l); },
    removeEventListener: (_: string, l: () => void) => { listeners.delete(l); },
  };
  vi.stubGlobal('matchMedia', (q: string) => (q === '(prefers-reduced-motion: reduce)' ? list : { matches: false }));
  return (next: boolean) => act(() => { reduced = next; listeners.forEach((l) => l()); });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HeroParticles', () => {
  it('puts nothing in the server HTML, since the motion preference is not known there', () => {
    const html = renderToString(<HeroParticles />);
    expect(html).not.toContain('data-hero-static');
    expect(html).not.toContain('<canvas');
    expect(html).toContain('aria-hidden="true"');
  });

  it('shows the still scatter and no canvas under reduced motion', () => {
    motion(true);
    const { container } = render(<HeroParticles />);
    const svg = container.querySelector('svg[data-hero-static]');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('loads the particle field on the client when motion is allowed', async () => {
    motion(false);
    const { container } = render(<HeroParticles />);
    expect(await screen.findByTestId('field')).toBeInTheDocument();
    expect(container.querySelector('svg[data-hero-static]')).toBeNull();
  });
});

describe('HeroParticles, when the setting changes mid-session', () => {
  it('swaps the live field for the still scatter, and back', async () => {
    const setReduced = switchableMotion(false);
    const { container } = render(<HeroParticles />);
    expect(await screen.findByTestId('field')).toBeInTheDocument();

    setReduced(true);
    expect(screen.queryByTestId('field')).toBeNull();
    expect(container.querySelector('svg[data-hero-static]')).not.toBeNull();

    setReduced(false);
    expect(await screen.findByTestId('field')).toBeInTheDocument();
    expect(container.querySelector('svg[data-hero-static]')).toBeNull();
  });
});

describe('StaticScatter', () => {
  it('renders the same dashes every time, so server and client markup match', () => {
    const a = renderToString(<StaticScatter />);
    expect(a).toBe(renderToString(<StaticScatter />));
    expect(a.match(/<line /g)?.length).toBe(60);
    expect(a).toContain('var(--lift-1)');
    expect(a).toContain('var(--lift-3)');
  });

  it('drifts only when asked', () => {
    expect(renderToString(<StaticScatter />)).not.toContain('animate-[drift');
    expect(renderToString(<StaticScatter drift />)).toContain('animate-[drift');
  });
});
