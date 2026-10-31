'use client';

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Check, ClipboardCheck, ListChecks, SquareKanban, type LucideIcon } from 'lucide-react';
import { GROUP_INFO, GROUP_ORDER } from '@/lib/groups';
import { prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';

/**
 * Small, decorative previews of the product for the How it works steps, built from page elements and
 * drawn in the page's neutral tokens: each sits in its step's window (Billabong design doc, section 8).
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
 * A minimum height, not a fixed one, so it grows with large text; shorter on phones. Inside a window
 * body (--surface) it is a sunken --bg inset in a --border outline.
 */
function Frame({ icon: Icon, title, body = 'justify-center px-4 py-1.5 md:py-3', children }: { icon: LucideIcon; title: string; body?: string; children: ReactNode }) {
  const ref = usePlayOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-preview=""
      aria-hidden="true"
      className="flex min-h-32 flex-col overflow-hidden rounded-md border border-border bg-bg text-xs text-muted-fg md:min-h-44"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-fg md:py-2.5">
        <Icon size={16} strokeWidth={1.5} className="shrink-0 text-muted-fg" />
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
            <span className={i === 0 ? 'text-fg' : undefined}>{GROUP_INFO[group].label}</span>
            <span className="relative block h-1.5 min-w-0 rounded-full bg-border">
              <span
                data-anim="grow"
                className={cn('absolute inset-y-0 left-0 origin-left rounded-full', i === 0 ? 'bg-accent' : 'bg-border-strong')}
                style={at(150 + i * 120, { width: FILL[i] })}
              />
            </span>
          </div>
        ))}
      </div>
    </Frame>
  );
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
        <span className="min-h-12 rounded-md border border-dashed border-border-strong" />
        <span data-anim="slide" className="flex min-h-12 min-w-0 flex-col justify-center gap-1 rounded-md border border-border bg-surface px-1.5 py-1 text-fg" style={at(200)}>
          <span className="truncate">Application</span>
          <span className="flex items-center gap-1.5">
            <span className="block h-1 min-w-0 flex-1 rounded-full bg-border" />
            <span data-anim="pop" className="flex size-[20px] shrink-0 items-center justify-center rounded-full bg-accent text-surface" style={at(850)}>
              <Check size={16} strokeWidth={1.5} />
            </span>
          </span>
        </span>
        <span className="hidden h-7 items-center rounded-md border border-border bg-surface px-2 md:flex">
          <span className="block h-1 w-3/4 rounded-full bg-border" />
        </span>
      </div>
    </Frame>
  );
}

/** The Answer preview's rows: the length of each question's line, and whether it is ticked. */
const QUESTIONS = [
  { id: 'q1', width: '70%', answered: true },
  { id: 'q2', width: '55%', answered: true },
  { id: 'q3', width: '80%', answered: true },
  { id: 'q4', width: '60%', answered: false },
] as const;

/**
 * Answer: a questionnaire part-way through, like the step's art. Each question's line draws in, the
 * first three are ticked one after another, and the last waits with an empty circle.
 */
export function AnswerPreview() {
  return (
    <Frame icon={ClipboardCheck} title="Assessment">
      <div className="flex flex-col gap-1.5">
        {QUESTIONS.map(({ id, width, answered }, i) => (
          <span key={id} className="flex items-center gap-2">
            {answered ? (
              <span data-anim="pop" className="flex size-[20px] shrink-0 items-center justify-center rounded-full bg-accent text-surface" style={at(250 + i * 150)}>
                <Check size={16} strokeWidth={1.5} />
              </span>
            ) : (
              <span data-anim="fade" className="block size-[20px] shrink-0 rounded-full border border-dashed border-border-strong" style={at(250 + i * 150)} />
            )}
            <span data-anim="grow" className={cn('block h-1.5 origin-left rounded-full', answered ? 'bg-border-strong' : 'bg-border')} style={at(150 + i * 90, { width })} />
          </span>
        ))}
      </div>
    </Frame>
  );
}
