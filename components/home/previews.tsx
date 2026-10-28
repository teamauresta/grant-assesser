'use client';

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Check, FileText, ListChecks, SquareKanban, type LucideIcon } from 'lucide-react';
import { GROUP_INFO, GROUP_ORDER } from '@/lib/groups';
import { prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';

/**
 * Small, decorative previews of the product for the How it works steps, built from page elements.
 * Each plays once when scrolled into view (the CSS is in app/globals.css): like <Reveal>, the start
 * state is held only after hydration, only below the first screen and only with motion allowed;
 * otherwise, and in the exported HTML, the end state shows.
 */
function usePlayOnce<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.dataset.play = 'ready';
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      el.dataset.play = 'run';
      io.disconnect();
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** A part's start delay in ms. The first parts wait for the step's own fade-in to get going. */
const at = (ms: number, extra?: CSSProperties) => ({ '--d': `${ms}ms`, ...extra }) as CSSProperties;

/**
 * The card every preview sits in: a title bar, then the body (centred unless `body` says otherwise).
 * A minimum height, not a fixed one, so it grows with large text; shorter on phones.
 */
function Frame({ icon: Icon, title, body = 'justify-center px-4 py-1.5 md:py-3', children }: { icon: LucideIcon; title: string; body?: string; children: ReactNode }) {
  const ref = usePlayOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-preview=""
      aria-hidden="true"
      className="flex min-h-32 flex-col overflow-hidden rounded-xl bg-panel-surface text-xs text-panel-muted-fg ring-1 ring-inset ring-panel-fg/[0.07] md:min-h-44"
    >
      <div className="flex items-center gap-2 border-b border-panel-fg/[0.07] px-4 py-2 text-panel-fg md:py-2.5">
        <Icon size={16} strokeWidth={1.5} className="shrink-0 text-panel-muted-fg" />
        <span className="min-w-0 truncate font-medium">{title}</span>
      </div>
      <div className={cn('flex min-h-0 flex-1 flex-col', body)}>{children}</div>
    </div>
  );
}

/** Relative fill of each group's bar. Only a shape: real counts depend on the answers. */
const FILL = ['80%', '45%', '60%', '25%'];

/** Assess: the four result groups fill in. Labels size their column, so large text wraps them. */
export function AssessPreview() {
  return (
    <Frame icon={ListChecks} title="Results">
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 md:gap-y-3">
        {GROUP_ORDER.map((group, i) => (
          <div key={group} className="contents">
            <span className={i === 0 ? 'text-panel-fg' : undefined}>{GROUP_INFO[group].label}</span>
            <span className="relative block h-1.5 min-w-0 rounded-full bg-panel-fg/[0.07]">
              <span
                data-anim="grow"
                className={cn('absolute inset-y-0 left-0 origin-left rounded-full', i === 0 ? 'bg-panel-fg/70' : 'bg-panel-fg/30')}
                style={at(150 + i * 120, { width: FILL[i] })}
              />
            </span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** A placeholder line of text that draws in from the left, starting `start` ms into the play. */
function DrawnLine({ className, start }: { className: string; start: number }) {
  return <span data-anim="grow" className={cn('block origin-left', className)} style={at(start)} />;
}

/**
 * Plan: an application moves from Preparing to Submitted, and is ticked. The empty slot and the card
 * share a grid row, so they stay the same size; --slide-gap is the column gap the card crosses.
 */
export function PlanPreview() {
  return (
    <Frame icon={SquareKanban} title="My plan">
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5" style={{ '--slide-gap': '0.5rem' } as CSSProperties}>
        <span className="min-w-0 truncate">Preparing</span>
        <span className="min-w-0 truncate">Submitted</span>
        <span className="min-h-12 rounded-md border border-dashed border-panel-muted-fg/40" />
        <span data-anim="slide" className="flex min-h-12 min-w-0 flex-col justify-center gap-1 rounded-md bg-panel-bg px-1.5 py-1 text-panel-fg ring-1 ring-panel-fg/10" style={at(200)}>
          <span className="truncate">Application</span>
          <span className="flex items-center gap-1.5">
            <span className="block h-1 min-w-0 flex-1 rounded-full bg-panel-fg/20" />
            <span data-anim="pop" className="flex size-[20px] shrink-0 items-center justify-center rounded-full bg-panel-fg/10" style={at(850)}>
              <Check size={16} strokeWidth={1.5} />
            </span>
          </span>
        </span>
        <span className="hidden h-7 items-center rounded-md bg-panel-fg/[0.04] px-2 md:flex">
          <span className="block h-1 w-3/4 rounded-full bg-panel-fg/20" />
        </span>
      </div>
    </Frame>
  );
}

/**
 * Report: a PDF page whose lines draw in. The page hangs from the top of the body and runs off the
 * card's bottom edge, so it never sets the card's height.
 */
export function ReportPreview() {
  return (
    <Frame icon={FileText} title="Report" body="relative">
      <div className="absolute inset-x-0 top-3 mx-auto flex w-4/5 max-w-60 flex-col gap-1.5 rounded-t-md bg-panel-bg px-4 pt-3 pb-4 ring-1 ring-panel-fg/10 md:top-4 md:pt-4">
        <span className="mb-1 flex items-center gap-2 md:mb-1.5">
          <span data-anim="pop" className="block size-3 shrink-0 rounded-sm bg-panel-fg/30" style={at(150)} />
          <DrawnLine className="h-2 w-1/2 rounded-full bg-panel-fg/60" start={200} />
        </span>
        {['w-full', 'w-[92%]', 'w-[96%]', 'w-[70%]'].map((w, i) => (
          <DrawnLine key={w} className={cn('h-1.5 rounded-full bg-panel-fg/25', w)} start={290 + i * 90} />
        ))}
        {/* Below the card's bottom edge on phones, so hidden there rather than animating unseen. */}
        <span className="mt-2 hidden grid-cols-2 gap-1.5 md:grid">
          <span data-anim="fade" className="block h-5 rounded-sm bg-panel-fg/[0.07]" style={at(650)} />
          <span data-anim="fade" className="block h-5 rounded-sm bg-panel-fg/[0.07]" style={at(740)} />
        </span>
      </div>
    </Frame>
  );
}
