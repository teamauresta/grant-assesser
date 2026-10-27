// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { act, render, screen } from '@testing-library/react';
import { CountUp } from '@/components/motion/count-up';

const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-AU')}`;

afterEach(() => vi.unstubAllGlobals());

/** Captures requestAnimationFrame callbacks so a test can step through a tween. */
function stubFrames() {
  const frames: ((t: number) => void)[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => { frames.push(cb); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const step = (t: number) => act(() => { frames.shift()?.(t); });
  return { frames, step };
}

/** The visible, animated number (the one with a ref; not the width holder, not the sr-only copy). */
const animated = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-count]')!;

describe('CountUp', () => {
  it('puts the final value in the server HTML', () => {
    expect(renderToString(<CountUp value={45000} format={fmt} />)).toContain('$45,000');
  });
  it('always exposes the final value to assistive technology', () => {
    render(<CountUp value={45000} format={fmt} />);
    expect(screen.getByText('$45,000', { selector: '.sr-only' })).toBeInTheDocument();
  });

  it('holds the width of the final value from the start, so counting never shifts the layout', () => {
    stubFrames();
    const { container } = render(<CountUp value={45000} format={fmt} />);
    expect(animated(container)).toHaveTextContent('$0');
    const holder = container.querySelector('.invisible');
    expect(holder).toHaveTextContent('$45,000');
    expect(holder).toHaveAttribute('aria-hidden', 'true');
    // Both sit in the same grid cell, so the wider final value sets the width.
    expect(holder!.parentElement).toBe(animated(container).parentElement);
    expect(holder!.parentElement).toHaveClass('inline-grid');
  });

  it('counts on from the value already shown when the value changes', () => {
    const { step } = stubFrames();
    const { container, rerender } = render(<CountUp value={100} format={fmt} ms={100} />);
    step(0);
    step(100);
    expect(animated(container)).toHaveTextContent('$100');
    rerender(<CountUp value={200} format={fmt} ms={100} />);
    expect(animated(container)).toHaveTextContent('$100');
    step(1000);
    expect(animated(container)).toHaveTextContent('$100');
    step(1050);
    const mid = Number(animated(container).textContent!.replace(/\D/g, ''));
    expect(mid).toBeGreaterThan(100);
    expect(mid).toBeLessThan(200);
    step(1100);
    expect(animated(container)).toHaveTextContent('$200');
    expect(screen.getByText('$200', { selector: '.sr-only' })).toBeInTheDocument();
  });
});
