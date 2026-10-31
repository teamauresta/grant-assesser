import Link from 'next/link';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { PROGRAMS } from '@/content/programs';
import { latestVerified } from '@/lib/programs/stats';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { Art } from '@/components/ui/art';
import { buttonClasses } from '@/components/ui/button';
import { focusRing } from '@/components/ui/focus-ring';
import { Highlight } from '@/components/ui/highlight';
import { HeroStats } from './hero-stats';

/**
 * The home page's opening section (Billabong design doc, section 8): the promise with one marker
 * highlight, the two calls to action and live numbers on the left, the billabong diorama on the
 * right. On phones it stacks: the text and calls to action, then the diorama, then the numbers.
 * One grid, so the diorama sits between the calls to action and the numbers on phones and spans
 * both rows beside them from md up.
 */
export function Hero() {
  const verified = latestVerified(PROGRAMS);
  return (
    <section
      aria-labelledby="hero-heading"
      className="grid grid-cols-1 gap-8 pt-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center md:gap-x-10 md:gap-y-8 md:pt-6"
    >
      <div className="flex flex-col items-start gap-6">
        <Link
          href="/programs/"
          className={cn('inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface py-1 pr-4 pl-1 text-sm hover:border-border-strong', focusRing)}
        >
          {/* On phones the badge shows only its icon, so the pill stays on one line at 375px. */}
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-1.5 py-1 text-xs font-semibold text-on-primary sm:px-2.5">
            <BadgeCheck aria-hidden="true" size={16} strokeWidth={1.5} />
            <span className="max-sm:sr-only">Verified</span>
          </span>
          <span>
            <span className="num">{PROGRAMS.length}</span> programs checked{' '}
            <time dateTime={verified} className="num whitespace-nowrap">{formatDate(verified)}</time>
          </span>
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} className="text-muted-fg" />
        </Link>
        <h1 id="hero-heading" className="text-[clamp(2.5rem,5.5vw,4.25rem)] leading-[1.05] font-bold tracking-[-0.035em]">
          <span className="block motion-safe:animate-rise">Find the funding</span>{' '}
          <span className="block motion-safe:animate-rise-late">your startup <Highlight>qualifies for</Highlight></span>
        </h1>
        <p className="max-w-2xl text-base text-muted-fg md:text-xl">
          Grants, tax incentives, credits and accelerators across Australia, checked against official sources and matched to you in six short steps.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/assess/" className={buttonClasses({ variant: 'primary', size: 'lg' })}>
            Start free assessment
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
          </Link>
          <Link href="/programs/" className={buttonClasses({ size: 'lg' })}>Browse programs</Link>
        </div>
      </div>
      {/* The diorama: priority, so it is fetched early (a light/dark pair stays lazy, so each theme
          fetches only its own picture). 100vw less the gutters on phones, about 45% of the window
          beside the text, and at most 33rem inside the 1120px column. */}
      <Art
        name="hero-diorama"
        priority
        sizes="(min-width: 70rem) 33rem, (min-width: 48rem) 45vw, calc(100vw - 2rem)"
        className="w-full max-w-[36rem] justify-self-center md:col-start-2 md:row-span-2 md:row-start-1"
      />
      <div className="md:col-start-1">
        <HeroStats />
      </div>
    </section>
  );
}
