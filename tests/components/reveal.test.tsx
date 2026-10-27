// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { act, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { Reveal } from '@/components/motion/reveal';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A fake IntersectionObserver that lets the test say when the element comes into view. */
function stubObserver() {
  const observers: { callback: IntersectionObserverCallback; options?: IntersectionObserverInit; disconnected: boolean }[] = [];
  vi.stubGlobal('IntersectionObserver', class {
    record;
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.record = { callback, options, disconnected: false };
      observers.push(this.record);
    }
    observe() {}
    unobserve() {}
    disconnect() { this.record.disconnected = true; }
    takeRecords() { return []; }
  });
  const intersect = () => act(() => {
    for (const o of observers) o.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  });
  return { observers, intersect };
}

const startAt = (top: number) => vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top, bottom: top + 40, left: 0, right: 100, width: 100, height: 40, x: 0, y: top, toJSON: () => ({}) } as DOMRect);

describe('Reveal', () => {
  it('never hides content in the exported HTML', () => {
    const html = renderToString(<Reveal><p>Hello</p></Reveal>);
    expect(html).toContain('Hello');
    expect(html).not.toContain('data-reveal');
    expect(html).not.toContain('opacity');
  });

  it('leaves content visible when IntersectionObserver is not available', () => {
    expect(typeof IntersectionObserver).toBe('undefined');
    render(<Reveal><p>Hello</p></Reveal>);
    const p = screen.getByText('Hello');
    expect(p).toBeVisible();
    expect(p.parentElement).not.toHaveAttribute('data-reveal');
  });

  it('hides an item below the first screen until it scrolls into view, with no negative margin', () => {
    const { observers, intersect } = stubObserver();
    startAt(window.innerHeight + 500);
    render(<Reveal><p>Below</p></Reveal>);
    const wrapper = screen.getByText('Below').parentElement!;
    expect(wrapper).toHaveAttribute('data-reveal', 'hidden');
    // A negative bottom margin could leave a short last item on the page hidden for good.
    expect(observers[0].options?.rootMargin ?? '0px').toBe('0px');
    intersect();
    expect(wrapper).toHaveAttribute('data-reveal', 'shown');
    expect(observers[0].disconnected).toBe(true);
  });

  it('does not hide an item that starts on the first screen', () => {
    stubObserver();
    startAt(100);
    render(<Reveal><p>Above</p></Reveal>);
    expect(screen.getByText('Above').parentElement).not.toHaveAttribute('data-reveal');
  });

  it('never hides anything when the device asks for reduced motion', () => {
    stubObserver();
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(prefers-reduced-motion: reduce)' }));
    startAt(window.innerHeight + 500);
    render(<Reveal><p>Still</p></Reveal>);
    expect(screen.getByText('Still').parentElement).not.toHaveAttribute('data-reveal');
  });

  it('has CSS that shows hidden content when it holds focus and when printing', () => {
    const css = readFileSync('app/globals.css', 'utf8').replace(/\s+/g, ' ');
    expect(css).toContain('[data-reveal="hidden"]:focus-within { opacity: 1; translate: none; }');
    expect(css).toMatch(/@media print \{ \[data-reveal\] \{ opacity: 1 !important; translate: none !important; \} \}/);
  });
});
