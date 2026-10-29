import Link from 'next/link';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { PROGRAMS } from '@/content/programs';
import { latestVerified } from '@/lib/programs/stats';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { buttonClasses } from '@/components/ui/button';
import { focusRing } from '@/components/ui/focus-ring';
import { HeroAurora } from './hero-aurora';
import { HeroStats } from './hero-stats';

/** The home page's opening section: the promise, the two calls to action and live numbers. */
export function Hero() {
  const verified = latestVerified(PROGRAMS);
  return (
    <section aria-labelledby="hero-heading" className="relative isolate -mx-4 -mt-6 px-4 pt-10 pb-16 md:-mt-10 md:pt-20 md:pb-16">
      <div className="relative z-10 flex max-w-4xl flex-col items-start gap-6">
        <Link
          href="/programs/"
          className={cn('inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-bg/80 py-1 pr-4 pl-1 text-sm backdrop-blur-sm hover:border-border-strong', focusRing)}
        >
          {/* On phones the badge shows only its icon, so the pill stays on one line at 375px. */}
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-1.5 py-1 text-xs font-semibold text-on-primary sm:px-2.5">
            <BadgeCheck aria-hidden="true" size={16} strokeWidth={1.5} />
            <span className="max-sm:sr-only">Verified</span>
          </span>
          <span>
            {PROGRAMS.length} programs checked <time dateTime={verified} className="whitespace-nowrap">{formatDate(verified)}</time>
          </span>
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} className="text-muted-fg" />
        </Link>
        <h1 id="hero-heading" className="text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-[-0.04em]">
          <span className="block motion-safe:animate-rise">Find the funding</span>{' '}
          <span className="block text-accent motion-safe:animate-rise-late">your startup qualifies for</span>
        </h1>
        <p className="max-w-2xl text-base text-muted-fg md:text-xl">
          Grants, tax incentives, credits and accelerators across Australia, checked against official sources and matched to you in six short steps.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/assess/" className={buttonClasses({ variant: 'primary', className: 'glow-brand min-h-12 px-6 text-base' })}>
            Start free assessment
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
          </Link>
          <Link href="/programs/" className={buttonClasses({ className: 'min-h-12 px-6 text-base' })}>Browse programs</Link>
        </div>
        <HeroStats />
      </div>
      {/* After the content, so its pause button follows the headline and links in reading and tab
          order; the field itself sits behind (absolute, -z-10). */}
      <HeroAurora />
    </section>
  );
}
