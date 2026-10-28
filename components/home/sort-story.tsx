'use client';

import { useLayoutEffect, useMemo, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useMotionValueEvent, useScroll } from 'motion/react';
import { PROGRAMS } from '@/content/programs';
import { GROUP_ORDER } from '@/lib/assess';
import { GROUP_INFO } from '@/lib/assessment/results';
import { chipProgress, chipScatter, cloudSlots, scatterOffset, sortStory, SORT_END, type Box } from '@/lib/showcase';
import { prefersReducedMotion, tween } from '@/lib/motion';
import { useNow } from '@/lib/use-now';
import { cn } from '@/lib/cn';
import { buttonClasses } from '@/components/ui/button';
import { focusRing } from '@/components/ui/focus-ring';

/** 'pinned': scroll drives the sort (wide screens). 'settle': one short settle in view (phones). 'still': sorted. */
type Mode = 'pinned' | 'settle' | 'still';

const QUERIES = ['(prefers-reduced-motion: reduce)', '(min-width: 48rem)'];
const SETTLE_MS = 1200;
/**
 * The stage settles once its top passes 70% of the way down the screen. A share of the stage (an
 * IntersectionObserver threshold) could never be reached when the stage is taller than the screen.
 */
const SETTLE_LINE = '0px 0px -30% 0px';
/** Columns of the unsorted pile: the whole stage on wide screens, each group's own list on phones. */
const PILE_COLUMNS = { pinned: 5, settle: 2 };
/** Room (px) kept clear inside the pile, so tilted chips are not clipped by the stage. */
const PILE_INSET = 10;

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

/** Layout box relative to the stage (the chips' offset parent); transforms do not change it. */
const boxOf = (el: HTMLElement): Box => ({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
const inset = (b: Box, by: number): Box => ({ left: b.left + by, top: b.top + by, width: b.width - 2 * by, height: b.height - 2 * by });

/**
 * Writes each chip's unsorted place (--sx, --sy) from the real layout: on wide screens the pile
 * fills the stage under the column headings; on phones each chip is jumbled within its own list.
 */
function placePile(stage: HTMLElement, mode: 'pinned' | 'settle') {
  const lists = [...stage.querySelectorAll<HTMLElement>('ul')];
  const piles = mode === 'pinned'
    ? [{ cloud: { left: 0, top: lists[0]?.offsetTop ?? 0, width: stage.clientWidth, height: stage.clientHeight - (lists[0]?.offsetTop ?? 0) }, chips: [...stage.querySelectorAll<HTMLElement>('[data-chip]')] }]
    : lists.map((ul) => ({ cloud: boxOf(ul), chips: [...ul.querySelectorAll<HTMLElement>('[data-chip]')] }));
  for (const { cloud, chips } of piles) {
    const slots = cloudSlots(chips.map((el) => el.dataset.slug!), PILE_COLUMNS[mode]);
    for (const el of chips) {
      const { x, y } = scatterOffset(boxOf(el), inset(cloud, PILE_INSET), slots.get(el.dataset.slug!)!);
      el.style.setProperty('--sx', `${x}px`);
      el.style.setProperty('--sy', `${y}px`);
    }
  }
}

/** Moves every chip to overall progress `p` (0..1) and updates the visible landed counts. */
function applyProgress(stage: HTMLElement, p: number) {
  const sort = Math.min(1, p / SORT_END);
  const landed: Record<string, number> = {};
  for (const el of stage.querySelectorAll<HTMLElement>('[data-chip]')) {
    const t = Math.round(chipProgress(sort, Number(el.dataset.delay)) * 1000) / 1000;
    el.style.setProperty('--t', String(t));
    if (t >= 0.98) landed[el.dataset.group!] = (landed[el.dataset.group!] ?? 0) + 1;
  }
  for (const el of stage.querySelectorAll<HTMLElement>('[data-landed]')) {
    const count = String(landed[el.dataset.landed!] ?? 0);
    if (el.textContent !== count) el.textContent = count;
  }
}

/**
 * "Watch the programs sort themselves": every program checked against an example founder
 * (DEMO_PROFILE), with real results. The sorted layout is the real DOM, four lists of links, so
 * screen readers and keyboards always get the result; the unsorted pile is only a transform per
 * chip, driven by one progress value written straight to the style (no React render per frame).
 * On wide screens scrolling through the pinned section drives it; on phones it settles once, over
 * 1.2s, when the stage comes into view. Under reduced motion it shows the sorted result, still. The
 * groups depend on "now", so the stage fills in on the client.
 */
export function SortStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mode = useSyncExternalStore(subscribe, clientMode, serverMode);
  const modeRef = useRef<Mode>(mode);
  const now = useNow();
  const story = useMemo(() => (now ? sortStory(PROGRAMS, now) : null), [now]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (modeRef.current === 'pinned' && stageRef.current) applyProgress(stageRef.current, v);
  });

  useLayoutEffect(() => {
    modeRef.current = mode;
    const stage = stageRef.current;
    if (!story || !stage) return;
    const apply = (p: number) => applyProgress(stage, p);
    if (mode === 'still' || (mode === 'settle' && typeof IntersectionObserver === 'undefined')) return apply(1);

    // The pile depends on the layout, so it is measured again when the stage resizes or fonts load.
    let live = true;
    const place = () => { if (live) placePile(stage, mode); };
    place();
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    resize?.observe(stage);
    document.fonts?.ready.then(place, () => {});
    const stop = () => { live = false; resize?.disconnect(); };

    if (mode === 'pinned') {
      apply(scrollYProgress.get());
      return stop;
    }
    apply(0);
    let cancel = () => {};
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      cancel = tween(0, 1, SETTLE_MS, apply);
    }, { rootMargin: SETTLE_LINE });
    io.observe(stage);
    return () => { stop(); io.disconnect(); cancel(); };
  }, [story, mode, scrollYProgress]);

  return (
    <section ref={sectionRef} aria-labelledby="sort-heading" className="overflow-x-clip md:motion-safe:h-[250vh]">
      <div className="flex flex-col gap-6 md:motion-safe:sticky md:motion-safe:top-0 md:motion-safe:min-h-dvh md:motion-safe:justify-center md:motion-safe:py-10">
        <div className="flex max-w-2xl flex-col gap-2">
          <h2 id="sort-heading" className="text-3xl tracking-[-0.03em] md:text-5xl">Watch {PROGRAMS.length} programs sort themselves</h2>
          <p className="text-sm text-muted-fg md:text-base">
            Example: a pre-raise AI startup in Victoria, checked today against every program.
            {story && story.closed > 0 && ` ${story.closed} closed programs are left out.`}
          </p>
        </div>
        <div ref={stageRef} data-stage className="relative grid min-h-[28rem] grid-cols-1 gap-6 overflow-clip p-1 md:grid-cols-4 md:gap-4">
          {story && GROUP_ORDER.map((g) => (
            <div key={g} className="flex min-w-0 flex-col gap-2">
              <h3 id={`sort-${g}`} className="flex items-baseline gap-2 text-base">
                {GROUP_INFO[g].label}{' '}
                <span aria-hidden="true" data-landed={g} className="num text-muted-fg">{story.groups[g].length}</span>
                <span className="sr-only">({story.groups[g].length})</span>
              </h3>
              <ul aria-labelledby={`sort-${g}`} className="flex flex-wrap gap-1.5 md:flex-col md:flex-nowrap md:items-start">
                {story.groups[g].map((chip) => {
                  const s = chipScatter(chip.slug);
                  return (
                    <li
                      key={chip.slug}
                      data-chip
                      data-slug={chip.slug}
                      data-group={g}
                      data-delay={s.delay}
                      className="max-w-full will-change-transform"
                      style={{ '--sr': `${s.rotate}deg` } as CSSProperties}
                    >
                      <Link
                        href={`/programs/${chip.slug}/`}
                        title={chip.name}
                        className={cn('block truncate rounded-full border border-border bg-surface px-3 py-1 text-xs hover:border-border-strong', focusRing)}
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
        <Link href="/assess/" className={buttonClasses({ className: 'min-h-11 self-start' })}>
          Run it for your company
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
        </Link>
      </div>
    </section>
  );
}
