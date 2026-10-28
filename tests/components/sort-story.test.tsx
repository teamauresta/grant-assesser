// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { act, render, screen, within } from '@testing-library/react';
import { SortStory } from '@/components/home/sort-story';
import { PROGRAMS } from '@/content/programs';
import { GROUP_ORDER } from '@/lib/assess';
import { GROUP_INFO } from '@/lib/assessment/results';
import { chipScatter, sortStory } from '@/lib/showcase';

// next/link drops the trailing slash under Vitest (trailingSlash is a next.config setting).
const path = (p: string) => expect.stringMatching(new RegExp(`^${p}/?$`));
const HEADING = `Watch ${PROGRAMS.length} programs sort themselves`;

/** Answers media queries: reduced motion and a wide (>= 48rem) screen. */
const media = ({ reduced = false, wide = false }) => vi.stubGlobal('matchMedia', (q: string) => ({
  matches: (reduced && q.includes('reduce')) || (wide && q.includes('min-width')),
  addEventListener: () => {}, removeEventListener: () => {},
}));

/** A fake IntersectionObserver that lets the test say when the stage comes into view. */
function stubObserver() {
  const observers: { callback: IntersectionObserverCallback; disconnected: boolean }[] = [];
  vi.stubGlobal('IntersectionObserver', class {
    record;
    constructor(callback: IntersectionObserverCallback) {
      this.record = { callback, disconnected: false };
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

const chips = () => [...document.querySelectorAll<HTMLElement>('[data-chip]')];
const progress = (el: HTMLElement) => el.style.getPropertyValue('--t');

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SortStory', () => {
  it('has the heading, caption and call to action in the server HTML, and no chips', () => {
    const html = renderToString(<SortStory />);
    expect(html).not.toContain('data-chip');
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.append(host);
    const region = within(host).getByRole('region', { name: HEADING });
    expect(within(region).getByText(/^Example: a pre-raise AI startup in Victoria/)).toBeInTheDocument();
    expect(within(region).getByRole('link', { name: 'Run it for your company' })).toHaveAttribute('href', path('/assess'));
    host.remove();
  });

  it('once "now" is known, lists every open program under its group, as links', () => {
    media({});
    render(<SortStory />);
    const story = sortStory(PROGRAMS, new Date());
    for (const g of GROUP_ORDER) {
      const list = screen.getByRole('list', { name: new RegExp(`^${GROUP_INFO[g].label}`) });
      expect(list).toHaveAccessibleName(`${GROUP_INFO[g].label} (${story.groups[g].length})`);
      const links = within(list).queryAllByRole('link');
      expect(links).toHaveLength(story.groups[g].length);
      story.groups[g].forEach((chip, i) => {
        expect(links[i]).toHaveAccessibleName(chip.name);
        expect(links[i]).toHaveAttribute('href', path(`/programs/${chip.slug}`));
      });
    }
    if (story.closed > 0) expect(screen.getByText(new RegExp(`${story.closed} closed programs are left out`))).toBeInTheDocument();
  });

  it('gives every chip its seeded tilt and stagger', () => {
    media({});
    render(<SortStory />);
    expect(chips().length).toBeGreaterThan(0);
    for (const el of chips()) {
      const s = chipScatter(el.dataset.slug!);
      expect(el.querySelector('a')).toHaveAttribute('href', path(`/programs/${el.dataset.slug}`));
      expect(el.style.getPropertyValue('--sr')).toBe(`${s.rotate}deg`);
      expect(el.dataset.delay).toBe(String(s.delay));
    }
  });

  it('when it moves, gives every chip a place in the pile, measured from the layout', () => {
    media({ wide: true });
    render(<SortStory />);
    for (const el of chips()) {
      expect(el.style.getPropertyValue('--sx')).toMatch(/^-?\d+(\.\d+)?px$/);
      expect(el.style.getPropertyValue('--sy')).toMatch(/^-?\d+(\.\d+)?px$/);
    }
  });

  it('when it is still, leaves the chips where they are sorted', () => {
    media({ reduced: true });
    render(<SortStory />);
    for (const el of chips()) expect(el.style.getPropertyValue('--sx')).toBe('');
  });

  it('under reduced motion shows the sorted result', () => {
    media({ reduced: true, wide: true });
    render(<SortStory />);
    expect(chips().length).toBeGreaterThan(0);
    for (const el of chips()) expect(progress(el)).toBe('1');
  });

  it('on a narrow screen without IntersectionObserver shows the sorted result: there is nothing to wait for', () => {
    media({});
    expect(typeof IntersectionObserver).toBe('undefined');
    render(<SortStory />);
    for (const el of chips()) expect(progress(el)).toBe('1');
  });

  it('on a narrow screen waits scattered until the stage is in view, then settles once', async () => {
    media({});
    const { observers, intersect } = stubObserver();
    render(<SortStory />);
    for (const el of chips()) expect(progress(el)).toBe('0');
    intersect();
    expect(observers.every((o) => o.disconnected)).toBe(true);
    // The settle is a 1.2s tween on animation frames.
    await act(() => new Promise((r) => setTimeout(r, 1500)));
    for (const el of chips()) expect(progress(el)).toBe('1');
  });

  it('on a wide screen starts scattered at the top of the scroll, and counts no landed chips yet', () => {
    media({ wide: true });
    render(<SortStory />);
    for (const el of chips()) expect(progress(el)).toBe('0');
    for (const el of document.querySelectorAll('[data-landed]')) expect(el.textContent).toBe('0');
  });
});
