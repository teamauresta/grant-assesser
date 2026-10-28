// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { act, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import type { ComponentType } from 'react';
import { AssessPreview, PlanPreview, ReportPreview } from '@/components/home/previews';
import { GROUP_INFO, GROUP_ORDER } from '@/lib/groups';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A fake IntersectionObserver that lets the test say when the preview comes into view. */
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
  const report = (isIntersecting: boolean) => act(() => {
    for (const o of observers) if (!o.disconnected) o.callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
  });
  return { observers, report };
}

const startAt = (top: number) => vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top, bottom: top + 140, left: 0, right: 300, width: 300, height: 140, x: 0, y: top, toJSON: () => ({}) } as DOMRect);

const PREVIEWS: [string, ComponentType][] = [['AssessPreview', AssessPreview], ['PlanPreview', PlanPreview], ['ReportPreview', ReportPreview]];

const root = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-preview]')!;

describe.each(PREVIEWS)('%s', (_, Preview) => {
  it('is decorative: everything sits inside an aria-hidden root', () => {
    const { container } = render(<Preview />);
    const el = root(container);
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild).toBe(el);
    expect(el.querySelectorAll('[data-anim]').length).toBeGreaterThan(0);
  });

  it('shows its end state in the exported HTML', () => {
    expect(renderToString(<Preview />)).not.toContain('data-play');
  });

  it('holds its start state below the first screen, then plays once when half in view', () => {
    const { observers, report } = stubObserver();
    startAt(window.innerHeight + 400);
    const { container } = render(<Preview />);
    const el = root(container);
    expect(el).toHaveAttribute('data-play', 'ready');
    expect(observers[0].options?.threshold).toBe(0.5);
    report(false);
    expect(el).toHaveAttribute('data-play', 'ready');
    report(true);
    expect(el).toHaveAttribute('data-play', 'run');
    expect(observers[0].disconnected).toBe(true);
  });

  it('shows its end state when it starts on screen', () => {
    stubObserver();
    startAt(100);
    const { container } = render(<Preview />);
    expect(root(container)).not.toHaveAttribute('data-play');
  });

  it('shows its end state under reduced motion', () => {
    stubObserver();
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(prefers-reduced-motion: reduce)' }));
    startAt(window.innerHeight + 400);
    const { container } = render(<Preview />);
    expect(root(container)).not.toHaveAttribute('data-play');
  });

  it('shows its end state without IntersectionObserver', () => {
    expect(typeof IntersectionObserver).toBe('undefined');
    startAt(window.innerHeight + 400);
    const { container } = render(<Preview />);
    expect(root(container)).not.toHaveAttribute('data-play');
  });

  // Durations come from app/globals.css: a shared default, overridden per kind of animation.
  it('finishes every animation within 1.5 seconds', () => {
    const css = readFileSync('app/globals.css', 'utf8').replace(/\s+/g, ' ');
    const base = Number(/\[data-play="run"\] \[data-anim\] \{ animation: (\d+)ms/.exec(css)![1]);
    const duration = (kind: string) => {
      const own = new RegExp(`\\[data-play="run"\\] \\[data-anim="${kind}"\\] \\{[^}]*animation-duration: (\\d+)ms`).exec(css);
      return own ? Number(own[1]) : base;
    };
    const { container } = render(<Preview />);
    for (const el of container.querySelectorAll<HTMLElement>('[data-anim]')) {
      const delay = Number.parseInt(el.style.getPropertyValue('--d') || '0', 10);
      expect(delay + duration(el.dataset.anim!)).toBeLessThanOrEqual(1500);
    }
  });
});

describe('AssessPreview', () => {
  it('lists the four result groups in order, with no counts', () => {
    const { container } = render(<AssessPreview />);
    const text = root(container).textContent!;
    const at = GROUP_ORDER.map((g) => text.indexOf(GROUP_INFO[g].label));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    // Counts would be invented: they depend on the visitor's answers.
    expect(text).not.toMatch(/\d/);
  });
});

describe('PlanPreview', () => {
  it('moves an application from Preparing to Submitted and ticks it', () => {
    const { container } = render(<PlanPreview />);
    const text = root(container).textContent!;
    expect(text).toContain('Preparing');
    expect(text).toContain('Submitted');
    expect(text).toContain('Application');
    expect(root(container).querySelector('[data-anim="slide"]')).toHaveTextContent('Application');
    expect(root(container).querySelector('[data-anim="pop"] svg')).not.toBeNull();
  });
});

describe('preview CSS', () => {
  const css = readFileSync('app/globals.css', 'utf8').replace(/\s+/g, ' ');
  const rules = css.slice(css.indexOf('[data-play="ready"]'), css.lastIndexOf('@keyframes preview-'));

  it('defines start states only under data-play="ready" and finite animations only under "run"', () => {
    expect(rules).not.toMatch(/infinite/);
    expect(rules).not.toMatch(/iteration-count/);
    for (const kind of ['grow', 'slide', 'pop', 'fade']) {
      expect(css).toContain(`[data-play="ready"] [data-anim="${kind}"]`);
      expect(css).toContain(`@keyframes preview-${kind}`);
    }
  });

  it('prints the end state', () => {
    expect(css).toMatch(/@media print \{ \[data-play\] \[data-anim\] \{[^}]*animation: none !important;[^}]*\} \}/);
  });
});
