'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PROGRAMS } from '@/content/programs';
import { GROUP_INFO, GROUP_ORDER } from '@/lib/groups';
import { chipProgress, chipScatter, cloudSlots, keepStory, pileLayout, pinProgress, scatterOffset, SORT_END, type Box, type Story } from '@/lib/showcase';
import { prefersReducedMotion, tween } from '@/lib/motion';
import { useNow } from '@/lib/use-now';
import { cn } from '@/lib/cn';
import { buttonClasses } from '@/components/ui/button';
import { focusRing } from '@/components/ui/focus-ring';

/**
 * 'pinned': scroll drives the sort (wide screens tall enough for the whole block). 'settle': one
 * short settle in view (phones, and short windows). 'still': sorted.
 */
type Mode = 'pinned' | 'settle' | 'still';

/** Where the section pins; the `pin` variant in app/globals.css is the same query plus motion allowed. */
export const PIN_QUERY = '(min-width: 48rem) and (min-height: 40rem)';
const QUERIES = ['(prefers-reduced-motion: reduce)', PIN_QUERY];
const SETTLE_MS = 1200;
/**
 * The stage settles once its top passes 70% of the way down the screen. A share of the stage (an
 * IntersectionObserver threshold) could never be reached when the stage is taller than the screen.
 */
const SETTLE_LINE = '0px 0px -30% 0px';
/** Columns of each group's own pile when settling (phones); the pinned pile sizes its own (pileLayout). */
const SETTLE_COLUMNS = 2;
/** Room (px) kept clear inside the pile, so tilted chips are not clipped by the stage. */
const PILE_INSET = 10;
/**
 * Height the stage reserves below 768px until the story arrives, stepped by width so it stays within
 * about 60px of the filled stage (filled heights measured on 28 Oct 2026, 320-767px wide: 984px at
 * 320 down to 504px at 767). Wider screens reserve md:min-h-[28rem], which the pile also uses.
 */
const RESERVED = 'min-h-[59rem] min-[460px]:min-h-[50rem] min-[500px]:min-h-[43rem] min-[550px]:min-h-[38rem] min-[690px]:min-h-[34rem]';

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const lists = QUERIES.map((q) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener?.('change', onChange));
  return () => lists.forEach((l) => l.removeEventListener?.('change', onChange));
}
const clientMode = (): Mode => {
  if (prefersReducedMotion()) return 'still';
  return typeof window.matchMedia === 'function' && window.matchMedia(QUERIES[1]).matches ? 'pinned' : 'settle';
};
const serverMode = (): Mode => 'still';

/**
 * The example's result, once "now" is known. The checks load with import(), so they are not in the
 * home page's first download. A new "now" that sorts every program the same way keeps the same
 * object, so the minute tick of useNow() does not restart anything. If the load fails (a redeploy
 * can remove the chunk an open page asks for), `failed` says so; each tick tries once more, and a
 * later success clears it.
 */
type StoryLoader = () => Promise<typeof import('@/lib/showcase-story')>;
const loadStory: StoryLoader = () => import('@/lib/showcase-story');

function useStory(load: StoryLoader): { story: Story | null; failed: boolean } {
  const now = useNow();
  const [story, setStory] = useState<Story | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!now) return;
    let cancelled = false;
    load()
      .then(({ sortStory }) => sortStory(PROGRAMS, now))
      .then(
        (next) => {
          if (cancelled) return;
          setFailed(false);
          setStory((prev) => keepStory(prev, next));
        },
        () => { if (!cancelled) setFailed(true); },
      );
    return () => { cancelled = true; };
  }, [now, load]);
  return { story, failed };
}

/** The stage's moving parts, collected once per render of the chips rather than per frame. */
type Parts = { stage: HTMLElement; chips: HTMLElement[]; counts: HTMLElement[]; lists: HTMLElement[] };

const partsOf = (stage: HTMLElement): Parts => ({
  stage,
  chips: [...stage.querySelectorAll<HTMLElement>('[data-chip]')],
  counts: [...stage.querySelectorAll<HTMLElement>('[data-landed]')],
  lists: [...stage.querySelectorAll<HTMLElement>('ul')],
});

/** Offset from the page's offset root, summed up the offsetParent chain; transforms do not change it. */
function offsetTo(el: HTMLElement, stop: Element | null) {
  let left = 0;
  let top = 0;
  let node: Element | null = el;
  while (node instanceof HTMLElement && node !== stop) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent;
  }
  return { left, top, reached: node === stop };
}

/**
 * Layout box relative to the stage. The stage is `relative`, so it is normally the offset parent of
 * every chip and list; if a style change ever breaks that, both are measured from the page instead.
 */
function boxIn(el: HTMLElement, stage: HTMLElement): Box {
  const own = offsetTo(el, stage);
  const origin = own.reached ? { left: 0, top: 0 } : offsetTo(stage, null);
  return { left: own.left - origin.left, top: own.top - origin.top, width: el.offsetWidth, height: el.offsetHeight };
}
const inset = (b: Box, by: number): Box => ({ left: b.left + by, top: b.top + by, width: b.width - 2 * by, height: b.height - 2 * by });

const setOffset = (el: HTMLElement, x: number, y: number) => {
  el.style.setProperty('--sx', `${Math.round(x * 100) / 100}px`);
  el.style.setProperty('--sy', `${Math.round(y * 100) / 100}px`);
};

/**
 * Writes each chip's unsorted place (--sx, --sy) from the real layout: when pinned, one pile over
 * the stage under the column headings, laid out from the chips' measured sizes; when settling, each
 * chip is jumbled within its own list.
 */
function placePile({ stage, chips, lists }: Parts, mode: 'pinned' | 'settle') {
  if (mode === 'pinned') {
    const listTop = lists[0] ? boxIn(lists[0], stage).top : 0;
    const cloud = inset({ left: 0, top: listTop, width: stage.clientWidth, height: stage.clientHeight - listTop }, PILE_INSET);
    const boxes = new Map(chips.map((el) => [el, boxIn(el, stage)]));
    const placed = pileLayout(chips.map((el) => ({ slug: el.dataset.slug!, width: boxes.get(el)!.width, height: boxes.get(el)!.height })), cloud);
    for (const el of chips) {
      const at = placed.get(el.dataset.slug!)!;
      const box = boxes.get(el)!;
      setOffset(el, at.left - box.left, at.top - box.top);
    }
    return;
  }
  for (const ul of lists) {
    const pile = chips.filter((el) => ul.contains(el));
    const slots = cloudSlots(pile.map((el) => el.dataset.slug!), SETTLE_COLUMNS);
    for (const el of pile) {
      const { x, y } = scatterOffset(boxIn(el, stage), inset(boxIn(ul, stage), PILE_INSET), slots.get(el.dataset.slug!)!);
      setOffset(el, x, y);
    }
  }
}

/** Moves every chip to overall progress `p` (0..1) and updates the visible landed counts. */
function paint({ chips, counts }: Parts, p: number) {
  const sort = Math.min(1, p / SORT_END);
  const landed: Record<string, number> = {};
  for (const el of chips) {
    const t = Math.round(chipProgress(sort, Number(el.dataset.delay)) * 1000) / 1000;
    const value = String(t);
    if (el.style.getPropertyValue('--t') !== value) el.style.setProperty('--t', value);
    if (t >= 0.98) landed[el.dataset.group!] = (landed[el.dataset.group!] ?? 0) + 1;
  }
  for (const el of counts) {
    const count = String(landed[el.dataset.landed!] ?? 0);
    if (el.textContent !== count) el.textContent = count;
  }
}

/**
 * "Watch the programs sort themselves": every program checked against an example founder
 * (DEMO_PROFILE), with real results. The sorted layout is the real DOM, four lists of links, so
 * screen readers and keyboards always get the result; the unsorted pile is only a transform per
 * chip, driven by one progress value written straight to the style (no React render per frame).
 * On wide screens scrolling through the pinned section drives it; on phones it settles once per
 * visit, over 1.2s, when the stage comes into view. Under reduced motion it shows the sorted
 * result, still, and so does a stage holding keyboard focus. The groups depend on "now", so the
 * stage fills in on the client, inside a reserved height.
 */
export function SortStory({ load = loadStory }: { /** Loads the story module; tests pass one that fails. */ load?: StoryLoader } = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mode = useSyncExternalStore(subscribe, clientMode, serverMode);
  const { story, failed } = useStory(load);
  /** The story could not load and there is nothing to show: no reserved height, just a way on. */
  const broken = failed && !story;
  /** The phone settle has started: later changes (new groups, a resize) show the result sorted. */
  const settled = useRef(false);
  /** A chip in the stage has focus, so CSS shows everything sorted; the counts follow. */
  const focused = useRef(false);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const section = sectionRef.current;
    if (!story || !stage || !section) return;
    const parts = partsOf(stage);
    let progress = 1;
    const show = (p: number) => {
      progress = p;
      paint(parts, focused.current ? 1 : p);
    };

    const onFocusIn = () => {
      focused.current = true;
      paint(parts, 1);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (e.relatedTarget instanceof Node && stage.contains(e.relatedTarget)) return;
      focused.current = false;
      paint(parts, progress);
    };
    focused.current = stage.contains(document.activeElement);
    stage.addEventListener('focusin', onFocusIn);
    stage.addEventListener('focusout', onFocusOut);
    const cleanups = [() => {
      stage.removeEventListener('focusin', onFocusIn);
      stage.removeEventListener('focusout', onFocusOut);
    }];
    const stop = () => cleanups.forEach((c) => c());

    if (mode === 'still' || (mode === 'settle' && (settled.current || typeof IntersectionObserver === 'undefined'))) {
      show(1);
      return stop;
    }

    // The pile depends on the layout: measured now, and again if the stage changes size or the
    // fonts finish loading (both change where the chips sit).
    placePile(parts, mode);
    let size = `${stage.clientWidth}x${stage.clientHeight}`;
    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(() => {
        const next = `${stage.clientWidth}x${stage.clientHeight}`;
        if (next !== size) {
          size = next;
          placePile(parts, mode);
        }
      });
      resize.observe(stage);
      cleanups.push(() => resize.disconnect());
    }
    let live = true;
    cleanups.push(() => { live = false; });
    if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(() => { if (live) placePile(parts, mode); }, () => {});

    if (mode === 'pinned') {
      // Scroll and resize schedule at most one frame; progress is read straight from the layout,
      // so a reload part-way down the section starts at the right place.
      const read = () => pinProgress(section.getBoundingClientRect().top, section.offsetHeight, window.innerHeight);
      let frame = 0;
      const onScroll = () => {
        if (!frame) frame = requestAnimationFrame(() => { frame = 0; show(read()); });
      };
      show(read());
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      cleanups.push(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        cancelAnimationFrame(frame);
      });
      return stop;
    }

    show(0);
    let cancel = () => {};
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      settled.current = true;
      // Linear to SORT_END: each chip's own stagger and ease-out shape the motion, over all 1.2s.
      cancel = tween(0, SORT_END, SETTLE_MS, show, (t) => t);
    }, { rootMargin: SETTLE_LINE });
    io.observe(stage);
    cleanups.push(() => { io.disconnect(); cancel(); });
    return stop;
  }, [story, mode]);

  return (
    // Pinned: the section is the scroll range and the block sticks, just below the sticky top bar
    // (--bar-h), over the rest of the window; the scroll range is unchanged.
    // A short window (pin-short) gets a one-line heading and smaller gaps and chips, so the whole
    // block, CTA included, fits on screen.
    // With nothing to sort (the story failed to load) there is no scroll range.
    <section ref={sectionRef} aria-labelledby="sort-heading" className={cn('overflow-x-clip', !broken && 'pin:h-[250vh]')}>
      <div className="flex flex-col gap-6 pin:sticky pin:top-(--bar-h) pin:min-h-[calc(100dvh-var(--bar-h))] pin:justify-center pin:py-10 pin-short:gap-4 pin-short:py-4">
        <div className="flex max-w-2xl flex-col gap-2 pin-short:max-w-none pin-short:gap-1">
          <h2 id="sort-heading" className="text-3xl tracking-[-0.03em] md:text-5xl pin-short:text-4xl">Watch {PROGRAMS.length} programs sort themselves</h2>
          <p className="text-sm text-muted-fg md:text-base pin-short:text-sm">
            Example: a pre-raise AI startup in Victoria, checked today against every program.
            {story && story.closed > 0 && ` ${story.closed} closed programs are left out.`}
          </p>
        </div>
        {/*
          `relative` makes the stage the chips' offset parent, which the pile measurement relies on.
          Until the story arrives the stage reserves about its filled height (RESERVED), so little
          below it moves; if the story cannot load, it holds a line pointing to the directory instead.
        */}
        <div
          ref={stageRef}
          data-stage
          className={cn('relative grid grid-cols-1 gap-6 overflow-clip p-1 md:grid-cols-4 md:gap-4', !broken && 'md:min-h-[28rem] pin-short:min-h-[23rem]', !story && !broken && RESERVED)}
        >
          <noscript>
            <p className="text-sm text-muted-fg">
              This example needs JavaScript.{' '}
              <Link href="/programs/" className={cn('rounded-sm text-accent underline underline-offset-4', focusRing)}>Browse all programs</Link>
              {' '}instead.
            </p>
          </noscript>
          {broken && (
            <p className="text-sm text-muted-fg">
              The example could not load.{' '}
              <Link href="/programs/" className={cn('rounded-sm text-accent underline underline-offset-4', focusRing)}>Browse all programs</Link>
              {' '}instead.
            </p>
          )}
          {story && GROUP_ORDER.map((g) => (
            <div key={g} className="flex min-w-0 flex-col gap-2">
              <h3 id={`sort-${g}`} className="flex items-baseline gap-2 text-base">
                {GROUP_INFO[g].label}{' '}
                <span aria-hidden="true" data-landed={g} className="num text-muted-fg">{story.groups[g].length}</span>
                <span className="sr-only">({story.groups[g].length})</span>
              </h3>
              <ul aria-labelledby={`sort-${g}`} className="flex flex-wrap gap-1.5 md:flex-col md:flex-nowrap md:items-start pin-short:gap-1">
                {story.groups[g].map((chip) => {
                  const s = chipScatter(chip.slug);
                  return (
                    <li
                      key={chip.slug}
                      data-chip
                      data-slug={chip.slug}
                      data-group={g}
                      data-delay={s.delay}
                      className="max-w-full"
                      style={{ '--sr': `${s.rotate}deg` } as CSSProperties}
                    >
                      {/* A small card (Billabong design doc, section 8): --surface in a --border outline,
                          rounded like a card rather than a pill. The same size as the old pill, so the
                          reserved heights and the pinned layouts still fit. */}
                      <Link
                        href={`/programs/${chip.slug}/`}
                        title={chip.name}
                        className={cn('block truncate rounded-md border border-border bg-surface px-3 py-1 text-xs hover:border-border-strong pin-short:py-0.5', focusRing)}
                      >
                        {chip.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <Link href="/assess/" className={buttonClasses({ className: 'self-start' })}>
          Run it for your company
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </section>
  );
}
