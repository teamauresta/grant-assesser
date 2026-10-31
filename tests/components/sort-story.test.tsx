// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PIN_QUERY, SortStory } from '@/components/home/sort-story';
import { PROGRAMS } from '@/content/programs';
import { GROUP_INFO, GROUP_ORDER } from '@/lib/groups';
import { chipScatter } from '@/lib/showcase';
import { sortStory } from '@/lib/showcase-story';
import { NOW_REFRESH_MS } from '@/lib/use-now';

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
    for (const o of observers) if (!o.disconnected) o.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  });
  return { observers, intersect };
}

/** Places the section's top edge `top` px from the top of the window, in a 2000px section. */
function sectionAt(top: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top, bottom: top + 2000, left: 0, right: 1280, width: 1280, height: 2000, x: 0, y: top, toJSON: () => ({}) } as DOMRect);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(2000);
}

const fakeTimers = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date', 'performance'] });

const chips = () => [...document.querySelectorAll<HTMLElement>('[data-chip]')];
const progress = (el: HTMLElement) => el.style.getPropertyValue('--t');
const counts = () => Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-landed]')].map((el) => [el.dataset.landed, el.textContent]));
const fullCounts = (story: ReturnType<typeof sortStory>) => Object.fromEntries(GROUP_ORDER.map((g) => [g, String(story.groups[g].length)]));
const zeroCounts = Object.fromEntries(GROUP_ORDER.map((g) => [g, '0']));

/**
 * Waits for the story, which loads with import() once "now" is known. Short act() scopes, so each
 * one flushes React's updates; promises only, so it works under fake timers too.
 */
async function filled(count = (n: number) => n > 0) {
  for (let i = 0; i < 50 && !count(chips().length); i++) await act(async () => { await import('@/lib/showcase-story'); });
  expect(count(chips().length)).toBe(true);
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SortStory', () => {
  it('has the heading, caption, call to action and an empty stage of fixed height in the server HTML', () => {
    const html = renderToString(<SortStory />);
    expect(html).not.toContain('data-chip');
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.append(host);
    const region = within(host).getByRole('region', { name: HEADING });
    expect(within(region).getByText(/^Example: a pre-raise AI startup in Victoria/)).toBeInTheDocument();
    expect(within(region).getByRole('link', { name: 'Run it for your company' })).toHaveAttribute('href', path('/assess'));
    // Reserved height, so little below moves when the chips fill in: stepped by width on phones and
    // small tablets (values measured in a browser), then the wide stage.
    const stage = host.querySelector<HTMLElement>('[data-stage]')!;
    for (const cls of ['min-h-[59rem]', 'min-[460px]:min-h-[50rem]', 'min-[500px]:min-h-[43rem]', 'min-[550px]:min-h-[38rem]', 'min-[690px]:min-h-[34rem]', 'md:min-h-[28rem]']) {
      expect(stage.classList).toContain(cls);
    }
    // The pinned scroll range is CSS (wide, tall enough, motion allowed), so it is in the server HTML.
    expect(within(host).getByRole('region', { name: HEADING }).className).toMatch(/(^|\s)pin:h-\[250vh\](\s|$)/);
    // Without JavaScript the stage stays empty, so it points to the directory.
    expect(stage.querySelector('noscript')?.innerHTML).toMatch(/href="\/programs\/?"[^>]*>Browse all programs</);
    host.remove();
  });

  it('once "now" is known, lists every open program under its group, as links, and frees the reserved height', async () => {
    media({});
    render(<SortStory />);
    await filled();
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
    expect(document.querySelector('[data-stage]')!.className).not.toMatch(/(^|\s)min-h-\[59rem\]|min-\[\d+px\]:min-h/);
  });

  it('gives every chip its seeded tilt and stagger', async () => {
    media({});
    render(<SortStory />);
    await filled();
    for (const el of chips()) {
      const s = chipScatter(el.dataset.slug!);
      expect(el.querySelector('a')).toHaveAttribute('href', path(`/programs/${el.dataset.slug}`));
      expect(el.style.getPropertyValue('--sr')).toBe(`${s.rotate}deg`);
      expect(el.dataset.delay).toBe(String(s.delay));
    }
  });

  // jsdom has no layout, so this checks only that a place is written, in px; the screenshots check the pile.
  it('when it moves, writes each chip a place in the pile, in px', async () => {
    media({ wide: true });
    sectionAt(300);
    render(<SortStory />);
    await filled();
    for (const el of chips()) {
      expect(el.style.getPropertyValue('--sx')).toMatch(/^-?\d+(\.\d+)?px$/);
      expect(el.style.getPropertyValue('--sy')).toMatch(/^-?\d+(\.\d+)?px$/);
    }
  });

  it('under reduced motion shows the sorted result, and leaves the chips where they are sorted', async () => {
    media({ reduced: true, wide: true });
    render(<SortStory />);
    await filled();
    for (const el of chips()) {
      expect(progress(el)).toBe('1');
      expect(el.style.getPropertyValue('--sx')).toBe('');
    }
  });

  it('on a narrow screen without IntersectionObserver shows the sorted result: there is nothing to wait for', async () => {
    media({});
    expect(typeof IntersectionObserver).toBe('undefined');
    render(<SortStory />);
    await filled();
    for (const el of chips()) expect(progress(el)).toBe('1');
  });

  it('on a narrow screen waits scattered until the stage is in view, then settles once, over 1.2s', async () => {
    fakeTimers();
    media({});
    const { observers, intersect } = stubObserver();
    render(<SortStory />);
    await filled();
    for (const el of chips()) expect(progress(el)).toBe('0');
    await intersect();
    expect(observers.every((o) => o.disconnected)).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(chips().some((el) => progress(el) !== '0' && progress(el) !== '1')).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(700));
    for (const el of chips()) expect(progress(el)).toBe('1');
  });

  // useNow() ticks every minute. The same groups must not restart the settle on phones.
  it('does not replay the settle when the clock ticks', async () => {
    fakeTimers();
    media({});
    const { intersect } = stubObserver();
    render(<SortStory />);
    await filled();
    await intersect();
    await act(() => vi.advanceTimersByTimeAsync(1300));
    const before = chips();
    await act(() => vi.advanceTimersByTimeAsync(NOW_REFRESH_MS));
    await act(() => vi.advanceTimersByTimeAsync(50));
    expect(chips()).toEqual(before);
    for (const el of chips()) expect(progress(el)).toBe('1');
  });

  it('after the settle, a real change of groups shows the new result sorted, not a second settle', async () => {
    fakeTimers();
    const start = new Date();
    const later = new Date(start.getTime() + 2 * 365 * 24 * 3600 * 1000);
    expect(sortStory(PROGRAMS, later)).not.toEqual(sortStory(PROGRAMS, start)); // deadlines pass in two years
    media({});
    const { intersect } = stubObserver();
    render(<SortStory />);
    await filled();
    await intersect();
    await act(() => vi.advanceTimersByTimeAsync(1300));
    vi.setSystemTime(later);
    await act(() => vi.advanceTimersByTimeAsync(NOW_REFRESH_MS));
    const expected = GROUP_ORDER.reduce((n, g) => n + sortStory(PROGRAMS, later).groups[g].length, 0);
    await filled((n) => n === expected);
    for (const el of chips()) expect(progress(el)).toBe('1');
  });

  it('on a wide screen starts scattered above the pin, and counts no landed chips yet', async () => {
    media({ wide: true });
    sectionAt(300);
    render(<SortStory />);
    await filled();
    for (const el of chips()) expect(progress(el)).toBe('0');
    expect(counts()).toEqual(zeroCounts);
  });

  it('on a wide screen follows the scroll, one frame per burst of scroll events', async () => {
    fakeTimers();
    media({ wide: true });
    sectionAt(300);
    render(<SortStory />);
    await filled();
    sectionAt(-1200); // the end of the pinned range: 2000px section, 768px jsdom window
    act(() => { window.dispatchEvent(new Event('scroll')); window.dispatchEvent(new Event('scroll')); });
    expect(chips().every((el) => progress(el) === '0')).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(20));
    for (const el of chips()) expect(progress(el)).toBe('1');
    expect(counts()).toEqual(fullCounts(sortStory(PROGRAMS, new Date())));
  });

  // A focused chip's stage shows everything sorted (CSS :focus-within); the counts must agree.
  it('shows full counts while a chip has focus, and the scroll position again after', async () => {
    media({ wide: true });
    sectionAt(300);
    render(<SortStory />);
    await filled();
    const outside = document.createElement('button');
    document.body.append(outside);
    expect(counts()).toEqual(zeroCounts);
    act(() => chips()[0].querySelector('a')!.focus());
    expect(counts()).toEqual(fullCounts(sortStory(PROGRAMS, new Date())));
    act(() => chips()[1].querySelector('a')!.focus());
    expect(counts()).toEqual(fullCounts(sortStory(PROGRAMS, new Date())));
    act(() => outside.focus());
    expect(counts()).toEqual(zeroCounts);
    outside.remove();
  });

  it('removes its listeners and observers when it unmounts', async () => {
    media({ wide: true });
    sectionAt(300);
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<SortStory />);
    await filled();
    const added = add.mock.calls.filter(([type]) => type === 'scroll' || type === 'resize');
    expect(added.map(([type]) => type).sort()).toEqual(['resize', 'scroll']);
    unmount();
    for (const [type, listener] of added) expect(remove).toHaveBeenCalledWith(type, listener);
  });

  it('disconnects the settle observer when it unmounts before the stage is in view', async () => {
    media({});
    const { observers } = stubObserver();
    const { unmount } = render(<SortStory />);
    await filled();
    expect(observers.length).toBeGreaterThan(0);
    unmount();
    expect(observers.every((o) => o.disconnected)).toBe(true);
  });

  it('adds no scroll listener on phones or under reduced motion', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    media({ reduced: true, wide: true });
    render(<SortStory />);
    await filled();
    cleanup();
    media({});
    render(<SortStory />);
    await filled();
    expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
  });

  // A redeploy can remove the chunk an open page asks for. Say so instead of leaving a hole.
  it('says so when the story cannot load, frees the reserved height, and recovers on the next tick', async () => {
    fakeTimers();
    media({});
    let fail = true;
    const load = () => (fail ? Promise.reject(new Error('chunk gone')) : import('@/lib/showcase-story'));
    render(<SortStory load={load} />);
    const message = () => screen.queryByText(/The example could not load/);
    for (let i = 0; i < 50 && !message(); i++) await act(async () => { await Promise.resolve(); });
    expect(message()).toBeInTheDocument();
    expect(within(message()!).getByRole('link', { name: 'Browse all programs' })).toHaveAttribute('href', path('/programs'));
    expect(document.querySelector('[data-stage]')!.className).not.toMatch(/min-h-/);
    expect(chips()).toHaveLength(0);
    // Nothing to sort, so no pinned scroll range either (it would be 150vh of empty scrolling).
    expect(screen.getByRole('region', { name: HEADING }).className).not.toMatch(/h-\[250vh\]/);

    fail = false;
    await act(() => vi.advanceTimersByTimeAsync(NOW_REFRESH_MS));
    await filled();
    expect(message()).toBeNull();
  });
});


// The story picks its mode in JavaScript (PIN_QUERY) and lays itself out with the CSS `pin` and
// `pin-short` variants (app/globals.css): they must name the same windows, or a window could be laid
// out pinned while it settles (or the reverse).
describe('pin query', () => {
  const css = readFileSync(join(import.meta.dirname, '../../app/globals.css'), 'utf8');
  const variant = (name: string) => new RegExp(`@custom-variant ${name} \\(@media (.+?)\\);`).exec(css)?.[1];
  const MOTION = ' and (prefers-reduced-motion: no-preference)';

  it('the pin variant is PIN_QUERY plus motion allowed', () => {
    expect(variant('pin')).toBe(PIN_QUERY + MOTION);
  });

  it('the pin-short variant is PIN_QUERY with a maximum height, plus motion allowed', () => {
    expect(variant('pin-short')).toMatch(new RegExp(`^${PIN_QUERY.replace(/[()]/g, '\\$&')} and \\(max-height: [\\d.]+rem\\)${MOTION.replace(/[()]/g, '\\$&')}$`));
  });
});
