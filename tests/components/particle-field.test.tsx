// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { IDLE_MS, SETTLE_MS } from '@/lib/particle-idle';
import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { IParticlesProps } from '@tsparticles/react';

// Stand in for tsParticles (it needs a canvas): record each options object it is handed, and
// report "loaded" once per options, as the real <Particles> does after each (re)load.
const seen: unknown[] = [];
const classAtLoad: (string | undefined)[] = [];
/** The container handed to particlesLoaded: only play() and pause() are used. */
const fake = { play: vi.fn(), pause: vi.fn() };
vi.mock('@tsparticles/react', async () => {
  const { useEffect } = await import('react');
  function Particles({ options, particlesLoaded, className, id }: IParticlesProps) {
    useEffect(() => {
      seen.push(options);
      classAtLoad.push(className);
      void particlesLoaded?.(fake as never);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- like the real one, only these reload
    }, [options, particlesLoaded]);
    return <div id={id} data-testid="particles" className={className} />;
  }
  return { default: Particles, ParticlesProvider: ({ children }: { children: ReactNode }) => <>{children}</> };
});
vi.mock('@tsparticles/slim', () => ({ loadSlim: async () => {} }));

const { default: ParticleField } = await import('@/components/home/particle-field');

const root = document.documentElement;
const setLift = (a: string, b: string, c: string) => {
  root.style.setProperty('--lift-1', a);
  root.style.setProperty('--lift-2', b);
  root.style.setProperty('--lift-3', c);
};
/** MutationObserver callbacks run as microtasks. */
const flush = () => act(async () => { await Promise.resolve(); });

afterEach(() => {
  seen.length = 0;
  classAtLoad.length = 0;
  root.removeAttribute('style');
  root.removeAttribute('data-theme');
  vi.unstubAllGlobals();
  vi.useRealTimers();
  fake.play.mockClear();
  fake.pause.mockClear();
});

describe('ParticleField', () => {
  it('ignores a theme attribute change that leaves the colours as they were', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    setLift('#0f766e', '#2563eb', '#7c3aed');
    const { getByTestId } = render(<ParticleField />);
    await flush();
    expect(seen).toHaveLength(1);
    expect(getByTestId('particles')).toHaveClass('opacity-100');

    act(() => root.setAttribute('data-theme', 'light'));
    await flush();
    expect(seen).toHaveLength(1);
  });

  it('reloads in the new colours on a real theme change and fades them in again', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    setLift('#0f766e', '#2563eb', '#7c3aed');
    const { getByTestId } = render(<ParticleField />);
    await flush();
    const particles = getByTestId('particles');

    setLift('#2dd4bf', '#60a5fa', '#a78bfa');
    act(() => root.setAttribute('data-theme', 'dark'));
    await flush();
    expect(seen).toHaveLength(2);
    expect(JSON.stringify(seen[1])).toContain('#2dd4bf');
    // Same element: the options change reloads the container, no remount needed.
    expect(getByTestId('particles')).toBe(particles);
    // Hidden while the new colours load, then faded back in.
    expect(classAtLoad[1]).toContain('opacity-0');
    expect(particles).toHaveClass('opacity-100');
  });

  it('settles after 5 seconds, moves again with the pointer over the hero, and pauses out of view', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    let report: (visible: boolean) => void = () => {};
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) { report = (v) => cb([{ isIntersecting: v }]); }
      observe() {}
      disconnect() {}
    });
    setLift('#0f766e', '#2563eb', '#7c3aed');
    const { getByTestId } = render(<ParticleField />);
    await flush();
    const area = getByTestId('particles').parentElement as HTMLElement;
    area.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) });
    const move = (x: number, y: number) => act(() => { window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y })); });

    act(() => { vi.advanceTimersByTime(SETTLE_MS); });
    expect(fake.pause).toHaveBeenCalledTimes(1);

    move(600, 500); // outside the hero
    expect(fake.play).not.toHaveBeenCalled();
    move(200, 150);
    expect(fake.play).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(IDLE_MS); });
    expect(fake.pause).toHaveBeenCalledTimes(2);

    move(200, 150);
    expect(fake.play).toHaveBeenCalledTimes(2);
    act(() => report(false));
    expect(fake.pause).toHaveBeenCalledTimes(3);
  });
});
