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
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
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

/** The card every preview sits in: a title bar, then the body (centred unless `body` says otherwise). */
function Frame({ icon: Icon, title, body = 'justify-center px-4 py-3', children }: { icon: LucideIcon; title: string; body?: string; children: ReactNode }) {
  const ref = usePlayOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-preview=""
      aria-hidden="true"
      className="flex h-44 flex-col overflow-hidden rounded-xl bg-panel-surface text-xs text-panel-muted-fg ring-1 ring-inset ring-panel-fg/[0.07]"
    >
      <div className="flex items-center gap-2 border-b border-panel-fg/[0.07] px-4 py-2.5 text-panel-fg">
        <Icon size={16} strokeWidth={1.5} className="text-panel-muted-fg" />
        <span className="font-medium">{title}</span>
      </div>
      <div className={cn('flex min-h-0 flex-1 flex-col', body)}>{children}</div>
    </div>
  );
}

/** Relative fill of each group's bar. Only a shape: real counts depend on the answers. */
const FILL = ['80%', '45%', '60%', '25%'];

/** Assess: the four result groups fill in. */
export function AssessPreview() {
  return (
    <Frame icon={ListChecks} title="Results">
      <div className="grid grid-cols-[4.5rem_1fr] items-center gap-x-3 gap-y-3">
        {GROUP_ORDER.map((group, i) => (
          <div key={group} className="contents">
            <span className={i === 0 ? 'text-panel-fg' : undefined}>{GROUP_INFO[group].label}</span>
            <span className="relative block h-1.5 rounded-full bg-panel-fg/[0.07]">
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

/** A placeholder line of text on a card or page. */
function Line({ className, delay }: { className: string; delay?: number }) {
  return <span data-anim={delay === undefined ? undefined : 'grow'} className={cn('block origin-left', className)} style={delay === undefined ? undefined : at(delay)} />;
}

/** Plan: an application moves from Preparing to Submitted, and is ticked. */
export function PlanPreview() {
  return (
    <Frame icon={SquareKanban} title="My plan">
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5" style={{ '--slide-gap': '0.5rem' } as CSSProperties}>
        <span>Preparing</span>
        <span>Submitted</span>
        <span className="flex flex-col gap-1.5">
          <span className="block h-[3.25rem] rounded-md border border-dashed border-panel-muted-fg/40" />
          <span className="flex h-7 flex-col justify-center gap-1 rounded-md bg-panel-fg/[0.04] px-2">
            <Line className="h-1 w-3/4 rounded-full bg-panel-fg/20" />
          </span>
        </span>
        <span>
          <span data-anim="slide" className="flex h-[3.25rem] flex-col justify-center gap-1.5 rounded-md bg-panel-bg px-2 text-panel-fg ring-1 ring-panel-fg/10" style={at(200)}>
            <span className="flex items-center justify-between gap-1">
              Application
              <span data-anim="pop" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-panel-fg/10" style={at(850)}>
                <Check size={16} strokeWidth={1.5} />
              </span>
            </span>
            <Line className="h-1 w-2/3 rounded-full bg-panel-fg/20" />
          </span>
        </span>
      </div>
    </Frame>
  );
}

/** Report: a PDF page, rising out of the card's bottom edge, whose lines draw in. */
export function ReportPreview() {
  return (
    <Frame icon={FileText} title="Report" body="justify-end px-4 pt-4">
      <div className="mx-auto -mb-2 flex w-4/5 max-w-60 flex-col gap-1.5 rounded-t-md bg-panel-bg px-4 pt-4 pb-5 ring-1 ring-panel-fg/10">
        <span className="mb-1.5 flex items-center gap-2">
          <span data-anim="pop" className="block size-3 shrink-0 rounded-sm bg-panel-fg/30" style={at(150)} />
          <Line className="h-2 w-1/2 rounded-full bg-panel-fg/60" delay={200} />
        </span>
        {['w-full', 'w-[92%]', 'w-[96%]', 'w-[70%]'].map((w, i) => (
          <Line key={w} className={cn('h-1.5 rounded-full bg-panel-fg/25', w)} delay={290 + i * 90} />
        ))}
        <span className="mt-2 grid grid-cols-2 gap-1.5">
          <span data-anim="fade" className="block h-5 rounded-sm bg-panel-fg/[0.07]" style={at(650)} />
          <span data-anim="fade" className="block h-5 rounded-sm bg-panel-fg/[0.07]" style={at(740)} />
        </span>
      </div>
    </Frame>
  );
}
